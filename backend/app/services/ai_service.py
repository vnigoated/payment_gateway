import base64
import json
from io import BytesIO
from typing import Any

import httpx
from fastapi import HTTPException, status
from groq import Groq
from pdf2image import convert_from_bytes
from PIL import Image

from app.config import settings


class AIService:
    DEFAULT_RESPONSE = {
        "customer_name": None,
        "customer_email": None,
        "customer_phone": None,
        "customer_address": None,
        "customer_gstin": None,
        "line_items": [],
        "gst_rate": 0,
        "discount": 0,
        "currency": "INR",
        "invoice_date": None,
        "due_date": None,
        "notes": None,
    }

    @classmethod
    def extract_invoice_data(cls, file_content: bytes, mime_type: str) -> dict[str, Any]:
        """
        Extract structured invoice data from an uploaded image or PDF.
        """
        image_bytes, image_mime_type = cls._prepare_visual_input(file_content, mime_type)
        errors: list[str] = []

        if settings.GROQ_API_KEY:
            try:
                return cls._extract_with_groq(image_bytes, image_mime_type)
            except HTTPException as exc:
                errors.append(exc.detail if isinstance(exc.detail, str) else str(exc.detail))

        if settings.GEMINI_API_KEY:
            try:
                return cls._extract_with_gemini(image_bytes, image_mime_type)
            except HTTPException as exc:
                errors.append(exc.detail if isinstance(exc.detail, str) else str(exc.detail))

        if not settings.GROQ_API_KEY and not settings.GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI scanning is not configured. Add GROQ_API_KEY or GEMINI_API_KEY in the backend environment.",
            )

        detail = "AI scanning is unavailable."
        if errors:
            detail = f"{detail} Tried available providers: {' | '.join(errors)}"
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)

    @classmethod
    def _scan_prompt(cls) -> str:
        return """
        Analyze this invoice or receipt and return only a valid JSON object.
        Use this exact shape:
        {
          "customer_name": "string or null",
          "customer_email": "string or null",
          "customer_phone": "string or null",
          "customer_address": "string or null",
          "customer_gstin": "string or null",
          "line_items": [
            {"name": "string", "quantity": number, "rate": number}
          ],
          "gst_rate": number,
          "discount": number,
          "currency": "3-letter currency code or null",
          "invoice_date": "YYYY-MM-DD or null",
          "due_date": "YYYY-MM-DD or null",
          "notes": "string or null"
        }

        Rules:
        - If a field is missing, use null for text/date fields and 0 for numeric fields.
        - Keep line_items as an empty array if no reliable items are visible.
        - quantity and rate must be numbers, not strings.
        - Do not include markdown, commentary, or extra keys.
        """

    @classmethod
    def _response_schema(cls) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "customer_name": {"type": ["string", "null"]},
                "customer_email": {"type": ["string", "null"]},
                "customer_phone": {"type": ["string", "null"]},
                "customer_address": {"type": ["string", "null"]},
                "customer_gstin": {"type": ["string", "null"]},
                "line_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "quantity": {"type": "number"},
                            "rate": {"type": "number"},
                        },
                        "required": ["name", "quantity", "rate"],
                        "propertyOrdering": ["name", "quantity", "rate"],
                    },
                },
                "gst_rate": {"type": "number"},
                "discount": {"type": "number"},
                "currency": {"type": ["string", "null"]},
                "invoice_date": {"type": ["string", "null"]},
                "due_date": {"type": ["string", "null"]},
                "notes": {"type": ["string", "null"]},
            },
            "required": [
                "customer_name",
                "customer_email",
                "customer_phone",
                "customer_address",
                "customer_gstin",
                "line_items",
                "gst_rate",
                "discount",
                "currency",
                "invoice_date",
                "due_date",
                "notes",
            ],
            "propertyOrdering": [
                "customer_name",
                "customer_email",
                "customer_phone",
                "customer_address",
                "customer_gstin",
                "line_items",
                "gst_rate",
                "discount",
                "currency",
                "invoice_date",
                "due_date",
                "notes",
            ],
        }

    @classmethod
    def _extract_with_groq(cls, image_bytes: bytes, image_mime_type: str) -> dict[str, Any]:
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        client = Groq(api_key=settings.GROQ_API_KEY)

        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": cls._scan_prompt()},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{image_mime_type};base64,{base64_image}",
                                },
                            },
                        ],
                    }
                ],
                model=settings.AI_SCAN_MODEL,
                response_format={"type": "json_object"},
            )
            response_text = chat_completion.choices[0].message.content or "{}"
            parsed = json.loads(response_text)
            return cls._normalize_response(parsed)
        except HTTPException:
            raise
        except Exception as exc:
            message = str(exc)
            if "organization_restricted" in message:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Groq is unavailable because the configured organization is restricted. Replace GROQ_API_KEY with a working key or configure GEMINI_API_KEY as a fallback.",
                ) from exc
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Groq scan failed: {message}",
            ) from exc

    @classmethod
    def _extract_with_gemini(cls, image_bytes: bytes, image_mime_type: str) -> dict[str, Any]:
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": cls._scan_prompt()},
                        {
                            "inlineData": {
                                "mimeType": image_mime_type,
                                "data": base64_image,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseJsonSchema": cls._response_schema(),
            },
        }

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.GEMINI_AI_SCAN_MODEL}:generateContent"
        )

        try:
            with httpx.Client(timeout=60) as client:
                response = client.post(
                    url,
                    params={"key": settings.GEMINI_API_KEY},
                    json=payload,
                )

            response.raise_for_status()
            data = response.json()
            response_text = cls._extract_gemini_text(data)
            parsed = json.loads(response_text)
            return cls._normalize_response(parsed)
        except HTTPException:
            raise
        except httpx.HTTPStatusError as exc:
            error_payload = exc.response.json().get("error", {}) if exc.response is not None else {}
            error_message = error_payload.get("message") or str(exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini scan failed: {error_message}",
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini scan failed: {exc}",
            ) from exc

    @staticmethod
    def _extract_gemini_text(payload: dict[str, Any]) -> str:
        candidates = payload.get("candidates") or []
        for candidate in candidates:
            content = candidate.get("content") or {}
            for part in content.get("parts") or []:
                text = part.get("text")
                if text:
                    return text

        prompt_feedback = payload.get("promptFeedback")
        if prompt_feedback:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini scan failed: {prompt_feedback}",
            )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini scan failed: no text output was returned by the model.",
        )

    @classmethod
    def _prepare_visual_input(cls, file_content: bytes, mime_type: str) -> tuple[bytes, str]:
        if mime_type == "application/pdf":
            try:
                images = convert_from_bytes(file_content, first_page=1, last_page=1, fmt="png")
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unable to read the uploaded PDF for AI scanning: {exc}",
                ) from exc

            if not images:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded PDF has no readable pages.")

            return cls._image_to_png_bytes(images[0]), "image/png"

        if mime_type.startswith("image/"):
            return file_content, mime_type

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only images and PDFs are supported")

    @staticmethod
    def _image_to_png_bytes(image: Image.Image) -> bytes:
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    @classmethod
    def _normalize_response(cls, payload: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(cls.DEFAULT_RESPONSE)
        normalized.update({k: v for k, v in payload.items() if k in normalized})

        line_items = []
        for item in payload.get("line_items") or []:
            if not isinstance(item, dict):
                continue
            line_items.append(
                {
                    "name": str(item.get("name") or "").strip(),
                    "quantity": cls._to_number(item.get("quantity"), fallback=1),
                    "rate": cls._to_number(item.get("rate"), fallback=0),
                }
            )

        normalized["line_items"] = [item for item in line_items if item["name"]]
        normalized["gst_rate"] = cls._sanitize_gst_rate(payload.get("gst_rate"))
        normalized["discount"] = cls._to_number(payload.get("discount"), fallback=0)
        normalized["currency"] = normalized["currency"] or "INR"
        return normalized

    @staticmethod
    def _sanitize_gst_rate(value: Any) -> int:
        rate = int(round(AIService._to_number(value, fallback=0)))
        return rate if rate in {0, 5, 12, 18, 28} else 0

    @staticmethod
    def _to_number(value: Any, fallback: float) -> float:
        try:
            if value in ("", None):
                return fallback
            return float(value)
        except (TypeError, ValueError):
            return fallback
