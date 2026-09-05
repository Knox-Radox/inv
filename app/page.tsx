import { Envelope } from "@/components/Envelope";
import { Controls } from "@/components/Controls";
import { Field } from "@/components/field/Field";
import { Invitation, cardSheet } from "@/components/Invitation";

/**
 * The invitation is first in the document and complete on the server. The
 * envelope follows it as a sibling, which is what lets the skip link work with
 * no JavaScript — see components/Envelope.module.css.
 *
 * Nothing about the order below is incidental: it is the reason this page
 * cannot lock a guest out.
 */
export default function Page() {
  return (
    <>
      <Invitation />
      <Field />
      <Controls />
      <Envelope cardSheet={cardSheet} />
    </>
  );
}
