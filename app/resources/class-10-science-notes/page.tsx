import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Class 10 Science Revision Notes | NCERT | Gen-Z AI",
  description: "Free Class 10 NCERT Science quick revision notes on chemical reactions, life processes, electricity and light. Ask Gen-Z AI your doubts.",
  alternates: { canonical: "/resources/class-10-science-notes" },
};

const topics = [
  { title: "Chemical Reactions and Equations", points: ["A balanced equation has equal numbers of each atom on both sides.", "Combination: two or more reactants form one product.", "Oxidation can involve addition of oxygen or removal of hydrogen."] },
  { title: "Life Processes", points: ["Nutrition, respiration, transport and excretion help organisms stay alive.", "Photosynthesis uses carbon dioxide and water to make glucose, releasing oxygen in the presence of light.", "The human heart has four chambers and supports double circulation."] },
  { title: "Electricity", points: ["Ohm’s law: V = IR (for an ohmic conductor at constant temperature).", "Electric power: P = VI; also P = I²R or V²/R.", "For resistors in series, R = R₁ + R₂ + …; in parallel, 1/R = 1/R₁ + 1/R₂ + …"] },
  { title: "Light: Reflection and Refraction", points: ["The angle of incidence equals the angle of reflection.", "Refractive index describes how light changes speed between media.", "For a spherical mirror: 1/f = 1/v + 1/u, using the standard sign convention."] },
];

export default function Class10ScienceNotes() {
  return <main style={{maxWidth:780,margin:"0 auto",padding:"24px 18px",fontFamily:"system-ui,sans-serif",lineHeight:1.65}}>
    <Link href="/resources">← All free resources</Link>
    <h1>Class 10 Science – Free NCERT Revision Notes</h1>
    <p>Quick, exam-focused revision for CBSE and other NCERT-aligned learners. Check your board syllabus and textbook for the exact chapter coverage.</p>
    {topics.map(topic => <section key={topic.title} style={{margin:"24px 0",padding:"16px",border:"1px solid #e1e6f0",borderRadius:12}}>
      <h2 style={{marginTop:0}}>{topic.title}</h2>
      <ul>{topic.points.map(point=><li key={point}>{point}</li>)}</ul>
    </section>)}
    <h2>How to revise effectively</h2>
    <p>Read one chapter, write down the key definitions and formulas, then practise numerical problems or short-answer questions without looking at the notes. Recheck your textbook for diagrams and examples.</p>
    <p><Link href="/#study-workspace" style={{display:"inline-block",background:"#4f46e5",color:"white",padding:"12px 18px",borderRadius:10,textDecoration:"none",fontWeight:700}}>Ask Gen-Z AI a Science Question</Link></p>
  </main>;
}
