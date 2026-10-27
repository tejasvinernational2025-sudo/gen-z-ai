"use client";

import { useState } from "react";

type Question = { question: string; options: [string,string,string,string]; answer: number; explanation: string };
const BANK: Record<string, Question[]> = {
  "NCERT Science": [
    {question:"Which cell organelle is called the powerhouse of the cell?",options:["Nucleus","Ribosome","Mitochondrion","Vacuole"],answer:2,explanation:"Mitochondria release usable energy through cellular respiration."},
    {question:"What is the SI unit of electric current?",options:["Volt","Ampere","Ohm","Watt"],answer:1,explanation:"Electric current is measured in amperes (A)."},
    {question:"Which gas is released during photosynthesis?",options:["Oxygen","Nitrogen","Hydrogen","Carbon dioxide"],answer:0,explanation:"Plants release oxygen during photosynthesis."},
    {question:"A solution with pH 3 is:",options:["Neutral","Basic","Acidic","Salt only"],answer:2,explanation:"A pH below 7 indicates an acidic solution."},
    {question:"What is the chemical formula of water?",options:["CO2","H2O","O2","NaCl"],answer:1,explanation:"Water contains two hydrogen atoms and one oxygen atom."}
  ],
  "NCERT Social Science": [
    {question:"Who chaired the Drafting Committee of the Indian Constitution?",options:["Mahatma Gandhi","B. R. Ambedkar","Jawaharlal Nehru","Sardar Patel"],answer:1,explanation:"Dr B. R. Ambedkar chaired the Drafting Committee."},
    {question:"Which imaginary line divides Earth into Northern and Southern Hemispheres?",options:["Prime Meridian","Tropic of Cancer","Equator","Arctic Circle"],answer:2,explanation:"The Equator lies at 0° latitude."},
    {question:"India became a republic on:",options:["15 August 1947","26 January 1950","2 October 1949","26 November 1950"],answer:1,explanation:"The Constitution came into effect on 26 January 1950."},
    {question:"The primary sector includes:",options:["Banking","Farming","Software services","Insurance"],answer:1,explanation:"Agriculture is part of the primary sector."},
    {question:"Which institution makes laws at the Union level in India?",options:["Supreme Court","Election Commission","Parliament","RBI"],answer:2,explanation:"Parliament is the Union legislature."}
  ],
  "UPSC Prelims": [
    {question:"Which Fundamental Right is protected by Article 21?",options:["Equality before law","Life and personal liberty","Freedom of religion","Right against exploitation"],answer:1,explanation:"Article 21 protects life and personal liberty."},
    {question:"The Tropic of Cancer passes through which of these states?",options:["Kerala","Punjab","Madhya Pradesh","Tamil Nadu"],answer:2,explanation:"The Tropic of Cancer crosses Madhya Pradesh."},
    {question:"Who appoints the Comptroller and Auditor General of India?",options:["Prime Minister","President","Chief Justice","Lok Sabha Speaker"],answer:1,explanation:"The President appoints the CAG."},
    {question:"Which schedule of the Constitution lists Union, State and Concurrent subjects?",options:["Fifth","Sixth","Seventh","Ninth"],answer:2,explanation:"The Seventh Schedule contains the three legislative lists."},
    {question:"Repo rate is the rate at which:",options:["Banks lend to customers","RBI lends to banks against eligible securities","Banks pay depositors","Government collects taxes"],answer:1,explanation:"The RBI's repo rate is used for short-term lending against eligible securities."}
  ],
  "UPSC CSAT": [
    {question:"If 20% of a number is 50, what is the number?",options:["100","200","250","500"],answer:2,explanation:"50 ÷ 0.20 = 250."},
    {question:"Find the next number: 2, 6, 12, 20, ?",options:["28","30","32","36"],answer:1,explanation:"Differences are 4, 6, 8, then 10."},
    {question:"A train travels 120 km in 2 hours. Average speed?",options:["40 km/h","50 km/h","60 km/h","80 km/h"],answer:2,explanation:"120 ÷ 2 = 60 km/h."},
    {question:"If A is taller than B and B taller than C, who is shortest?",options:["A","B","C","Cannot determine"],answer:2,explanation:"C is shorter than both B and A."},
    {question:"What is 3/4 of 80?",options:["40","50","60","70"],answer:2,explanation:"80 × 3 ÷ 4 = 60."}
  ]
};

export default function MockTestCard() {
  const [track,setTrack] = useState("NCERT Science");
  const [answers,setAnswers] = useState<Record<number,number>>({});
  const [submitted,setSubmitted] = useState(false);
  const questions = BANK[track];
  const score = questions.reduce((sum,q,i)=>sum+(answers[i]===q.answer?1:0),0);
  return <section id="mock-test" aria-label="Mock tests" style={{padding:20,margin:"18px 0",border:"1px solid #c8d4ee",borderRadius:16}}>
    <h2 style={{margin:"0 0 8px"}}>📝 NCERT & UPSC Mock Test</h2>
    <p>Free 5-question practice test · Instant result · Explanations. This is a starter practice test, not an official UPSC paper.</p>
    <label htmlFor="mock-track" style={{display:"block",marginBottom:6,fontWeight:700}}>Choose test</label>
    <select id="mock-track" value={track} onChange={e=>{setTrack(e.target.value);setAnswers({});setSubmitted(false);}} style={{width:"100%",maxWidth:360,padding:12,borderRadius:8,marginBottom:14}}>
      {Object.keys(BANK).map(k=><option key={k} value={k}>{k}</option>)}
    </select>
    <p><strong>{Object.keys(answers).length} of {questions.length} answered</strong></p>
    {questions.map((q,i)=><fieldset key={track+i} disabled={submitted} style={{border:"1px solid #d9dfed",borderRadius:12,padding:14,margin:"12px 0"}}>
      <legend style={{fontWeight:700}}>Q{i+1}. {q.question}</legend>
      {q.options.map((option,j)=><label key={j} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"7px 0",cursor:submitted?"default":"pointer"}}>
        <input type="radio" name={`mock-${track}-${i}`} checked={answers[i]===j} onChange={()=>setAnswers(prev=>({...prev,[i]:j}))} />
        <span>{String.fromCharCode(65+j)}. {option}</span>
      </label>)}
      {submitted && <p style={{margin:"8px 0 0",fontWeight:600}}>{answers[i]===q.answer?"✅ Correct":"❌ Incorrect"} · Answer: {q.options[q.answer]}<span style={{display:"block",fontWeight:400}}>{q.explanation}</span></p>}
    </fieldset>)}
    {submitted ? <div aria-live="polite"><h3>Result: {score}/{questions.length} ({Math.round(score/questions.length*100)}%)</h3><button type="button" onClick={()=>{setAnswers({});setSubmitted(false);}} style={{padding:"12px 18px",borderRadius:10}}>Try Again</button></div>
    : <button type="button" onClick={()=>setSubmitted(true)} disabled={Object.keys(answers).length!==questions.length} style={{padding:"12px 18px",borderRadius:10,fontWeight:700}}>Submit Mock Test</button>}
  </section>;
}
