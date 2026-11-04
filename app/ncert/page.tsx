"use client";

import { useState } from "react";
import Link from "next/link";

const subjects: Record<string, string[]> = {
  "6": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  "7": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  "8": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  "9": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  "10": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  "11": ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Geography", "Political Science", "Economics"],
  "12": ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Geography", "Political Science", "Economics"],
};

// Class 6 Maths learning units requested for Gen-Z AI.
// Keep this list separate from official textbook chapter claims because editions/boards can differ.
const classSixMathTopics = [
  "Integers",
  "Fractions",
  "Decimals",
  "Algebra",
  "Ratio and Proportion",
  "Symmetry",
  "Data Handling",
  "Mensuration",
];

export default function NCERTPage() {
  const [schoolClass, setSchoolClass] = useState("10");
  const [subject, setSubject] = useState("Science");
  const [chapter, setChapter] = useState("");
  const [copied, setCopied] = useState(false);
  const isClassSixMaths = schoolClass === "6" && subject === "Mathematics";
  const prompt = `I am studying Class ${schoolClass} ${subject}. ${chapter.trim() ? `Teach me the topic/chapter "${chapter.trim()}"` : "Help me choose and understand a topic"} in simple, age-appropriate language. Include a clear concept explanation, step-by-step solved examples, 5 practice questions with answers, and a short MCQ quiz. For mathematics, show every calculation step. Align the explanation with the student's school/NCERT level, but do not invent textbook wording or claim a topic is in a particular NCERT edition unless verified. If you are unsure about the textbook edition or chapter contents, say so.`;

  function changeClass(next: string) {
    setSchoolClass(next);
    setSubject(subjects[next][0]);
    setChapter("");
    setCopied(false);
  }

  return <main style={{maxWidth:840,margin:"auto",padding:"24px 18px",fontFamily:"system-ui,sans-serif",color:"#162849"}}>
    <Link href="/">← Gen-Z AI Home</Link>
    <header style={{margin:"28px 0 20px"}}>
      <h1 style={{fontSize:"clamp(28px,5vw,42px)",marginBottom:8}}>📚 NCERT Study Guide</h1>
      <p>अपनी Class, Subject और Chapter चुनें। फिर AI Tutor से आसान Explanation और Practice Questions माँगें।</p>
    </header>
    <section style={{background:"#eef3ff",borderRadius:18,padding:20,display:"grid",gap:15}}>
      <label style={{display:"grid",gap:7,fontWeight:700}}>1. Select Class
        <select value={schoolClass} onChange={e=>changeClass(e.target.value)} style={{padding:13,borderRadius:10,border:"1px solid #b7c7e8",fontSize:16}}>
          {Object.keys(subjects).map(c=><option key={c} value={c}>Class {c}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:7,fontWeight:700}}>2. Select Subject
        <select value={subject} onChange={e=>{setSubject(e.target.value);setChapter("");setCopied(false);}} style={{padding:13,borderRadius:10,border:"1px solid #b7c7e8",fontSize:16}}>
          {subjects[schoolClass].map(s=><option key={s}>{s}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:7,fontWeight:700}}>3. {isClassSixMaths ? "Select Class 6 Maths Topic" : "Enter Chapter Name"}
        {isClassSixMaths ? (
          <select value={chapter} onChange={e=>{setChapter(e.target.value);setCopied(false);}} style={{padding:13,borderRadius:10,border:"1px solid #b7c7e8",fontSize:16}}>
            <option value="">Choose a Maths topic</option>
            {classSixMathTopics.map(topic=><option key={topic} value={topic}>{topic}</option>)}
          </select>
        ) : (
          <input value={chapter} onChange={e=>{setChapter(e.target.value);setCopied(false);}} placeholder="Example: Electricity" style={{padding:13,borderRadius:10,border:"1px solid #b7c7e8",fontSize:16}} />
        )}
      </label>
      {isClassSixMaths && (
        <div style={{background:"#fff",borderRadius:12,padding:14}}>
          <strong>Class 6 Mathematics topics added</strong>
          <ul style={{margin:"10px 0 0",paddingLeft:22,lineHeight:1.8}}>
            {classSixMathTopics.map(topic=><li key={topic}>{topic}</li>)}
          </ul>
        </div>
      )}
      <div style={{background:"white",borderRadius:12,padding:14}}>
        <strong>Your AI Study Question</strong>
        <p style={{lineHeight:1.65,overflowWrap:"anywhere"}}>{prompt}</p>
        <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(prompt);setCopied(true);}catch{setCopied(false);}}} style={{padding:"12px 16px",background:"#234cce",color:"white",border:0,borderRadius:10,fontWeight:700,cursor:"pointer"}}>{copied?"✓ Copied":"Copy Question"}</button>
      </div>
      <Link href="/#study-workspace" style={{padding:14,borderRadius:10,background:"#132e74",color:"white",textAlign:"center",fontWeight:800,textDecoration:"none"}}>Open AI Tutor →</Link>
      <p style={{margin:0,fontSize:13}}>Question Copy करके AI Tutor के Chat Box में Paste करें। AI Tutor में अपनी Class भी Select करें।</p>
    </section>
    <section style={{marginTop:22,lineHeight:1.7}}>
      <h2>Verified textbook reference</h2>
      <p>Chapter names may differ by NCERT edition or academic year. Check your actual textbook before studying.</p>
      <a href="https://ncert.nic.in/textbook.php" target="_blank" rel="noopener noreferrer">Official NCERT Textbooks ↗</a>
      <p><Link href="/mock-tests">Try starter practice tests →</Link></p>
      <p style={{fontSize:13,color:"#56647e"}}>Class 6 Maths topic selection is now available here. Complete chapter-wise syllabus navigation and automated mastery tracking are still under development.</p>
    </section>
  </main>;
}
