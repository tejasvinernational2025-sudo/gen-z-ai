import Link from "next/link";
import MockTestCard from "../mock-test-card";
export const metadata = { title: "NCERT & UPSC Mock Tests | Gen-Z AI", description: "Practice NCERT and UPSC questions with instant scores and explanations." };
export default function MockTestsPage() { return <main style={{maxWidth:860,margin:"auto",padding:"24px 16px"}}><Link href="/">← Gen-Z AI Home</Link><MockTestCard /></main>; }