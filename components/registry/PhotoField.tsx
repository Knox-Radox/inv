"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "@/app/replies/registry/admin.module.css";

/** The longest side a stored picture needs. The page shows them at 168px. */
const LONGEST = 900;

/**
 * Where a gift's photograph comes from: an address pasted from the shop, or a
 * file chosen from the phone. Either, whichever is filled in last winning.
 *
 * A file is made smaller here, in the browser, before it is sent: a phone
 * photograph is 3 to 8 MB, which Vercel will not accept in a request and a
 * free storage quota should not be spent on. Without script the file goes up
 * as it is, and the route refuses one over 1.5 MB with a message that says so.
 */
export function PhotoField({ current }: { current: string | null }) {
  const addressId = useId();
  const fileId = useId();
  const file = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState(current ?? "");
  const [chosen, setChosen] = useState<string | null>(null);
  const [made, setMade] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (chosen) URL.revokeObjectURL(chosen);
    },
    [chosen],
  );

  async function onFile(input: HTMLInputElement) {
    const original = input.files?.[0];
    setMade(null);
    if (!original) return setChosen(null);
    try {
      const bitmap = await createImageBitmap(original);
      const scale = Math.min(1, LONGEST / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      // A transparent PNG goes onto white: the photograph's mat is white.
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.85));
      if (blob && blob.size < original.size) {
        const smaller = new File([blob], "photo.jpg", { type: "image/jpeg" });
        const list = new DataTransfer();
        list.items.add(smaller);
        input.files = list.files;
        setMade(`Made smaller for the page: ${Math.round(original.size / 1024)} KB to ${Math.round(blob.size / 1024)} KB.`);
        setChosen(URL.createObjectURL(smaller));
        return;
      }
    } catch {
      // A format the browser cannot draw (some HEIC): send it as it is, and
      // the route will say if it is not a picture it can use.
    }
    setChosen(URL.createObjectURL(original));
  }

  const preview = chosen ?? (address.startsWith("https://") ? address : null);

  return (
    <div className={styles.photoField}>
      <div className={styles.field}>
        <label htmlFor={addressId}>Photo address (optional)</label>
        <input
          id={addressId}
          name="image"
          type="text"
          inputMode="url"
          autoComplete="off"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="https://"
        />
        <p className={styles.help}>
          On the shop&rsquo;s page, press and hold the picture and choose &ldquo;Copy image address&rdquo;. A shop can
          change or remove its picture later; uploading one keeps it for good.
        </p>
      </div>
      <div className={styles.field}>
        <label htmlFor={fileId}>Or upload a picture</label>
        <input
          ref={file}
          id={fileId}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => void onFile(e.currentTarget)}
        />
        {made && <p className={styles.help}>{made}</p>}
        <p className={styles.help}>If you do both, the uploaded picture is the one kept.</p>
      </div>
      {preview && (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a preview of an address the family has just typed */}
          <img src={preview} alt="" referrerPolicy="no-referrer" />
        </div>
      )}
    </div>
  );
}
