import { purchaseHref } from "@/lib/courses";

type PurchaseLinkProps = {
  title: string;
  className?: string;
};

export function PurchaseLink({ title, className = "btn btn-purchase" }: PurchaseLinkProps) {
  return (
    <a className={className} href={purchaseHref(title)}>
      Purchase
      <span className="sr-only">{` ${title} on WhatsApp`}</span>
    </a>
  );
}
