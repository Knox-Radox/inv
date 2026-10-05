/**
 * The same keep-alive, at two more times of day. Supabase keeps a free project
 * awake on "a few requests to the database each day", and Vercel's free plan
 * runs each scheduled job at most once a day, so there are three jobs
 * (vercel.json), each with a path of its own.
 */
export const dynamic = "force-dynamic";
export { GET } from "../route";
