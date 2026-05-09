import { redirect } from 'next/navigation'

export default function InvoiceAliasPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/invoices/${params.id}`)
}
