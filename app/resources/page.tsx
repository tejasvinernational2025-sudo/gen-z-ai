"use client";
import { useState } from "react";
import Link from "next/link";

const formulas = [
 {subject:"Physics",items:[["Speed","v = distance / time"],["Acceleration","a = (v - u) / t"],["Force","F = ma"],["Work","W = Fs cos θ"],["Kinetic energy","KE = ½mv²"],["Ohm's law","V = IR"]]},
 {subject:"Chemistry",items:[["Moles","n = mass / molar mass"],["Molarity","M = moles of solute / litres of solution"],["Density","ρ = mass / volume"],["Ideal gas","PV = nRT"],["pH","pH = −log₁₀[H⁺]"]]},
 {subject:"Maths",items:[["Quadratic formula","x = (−b ± √(b² − 4ac)) / 2a"],["(a + b)²","a² + 2ab + b²"],["Pythagoras","a² + b² = c²"],["Circle area","A = πr²"],["Trigonometry","sin²θ + cos²θ = 1"]]}
];
const chapters = ["Mathematics — Algebra","Mathematics — Geometry","Mathematics — Trigonometry","Physics — Motion and Force","Physics — Electricity","Chemistry — Atoms and Molecules","Chemistry — Chemical Reactions","Biology — Cell and Tissues","Biology — Human Physiology","English — Reading and Writing"];
export default function ResourcesPage() {
 const [done,setDone] = useState<string[]>([]);
 const [exam,setExam] = useState("Board Exams");
 const toggle=(item:string)=>setDone(old=>old.includes(item)?old.filter(x=>x!==item):[...old,item]);
 return <main style={{maxWidth:1000,margin:"auto",padding:"28px 18px",fontFamily:"system-ui, sans-serif",color:"#14213d"}}>
  <style>{`@media print {.noPrint{display:none!important} body{background:white!important} .sheet{box-shadow:none!important;border:1px solid #ddd!important} } @media(max-width:600px){.resourceGrid{grid-template-columns:1fr!important}}`}</style>
  <div className="noPrint"><Link href="/" style={{color:"#315cf5"}}>← Back to Gen-z AI</Link></div>
  <header style={{padding:"24px 0"}}><div style={{fontWeight:800,color:"#365af5"}}>GEN-Z AI · FREE STUDY RESOURCES</div><h1 style={{fontSize:"clamp(30px,5vw,48px)",margin:"10px 0"}}>Study smarter. Revise faster.</h1><p>Free formula sheets, a printable syllabus checklist, and a guide to authentic previous-year papers. No payment required.</p></header>
  <section style={{background:"#edf3ff",padding:22,borderRadius:18,marginBottom:22}}><h2>📚 Previous Year Question Papers (PYQs)</h2><p>Choose your exam and use the official exam authority to find authentic papers and answer keys. Solved-paper downloads will appear here only after source and solution verification.</p>
  <div className="noPrint" style={{display:"flex",flexWrap:"wrap",gap:10}}>{["Board Exams","JEE Main","NEET UG","CUET UG"].map(x=><button key={x} onClick={()=>setExam(x)} style={{border:"1px solid #aebde9",borderRadius:12,padding:"10px 14px",background:exam===x?"#315cf5":"white",color:exam===x?"white":"#14213d"}}>{x}</button>)}</div>
  <p><strong>{exam}:</strong> {exam==="Board Exams"?"Check the official website of your board (such as CBSE or your state board) for year-wise question papers and marking schemes.":exam==="JEE Main"?"Use the National Testing Agency (NTA) JEE Main website for official question papers, answer keys and notices.":exam==="NEET UG"?"Use the NTA NEET UG website for official answer keys and exam materials.":"Use the NTA CUET UG website for official question papers and answer keys."}</p>
  <p className="noPrint" style={{fontSize:13}}>We do not label sample questions as actual PYQs.</p></section>
  <h2>⚡ Quick Formula & Cheat Sheets</h2><div className="resourceGrid" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:16}}>{formulas.map(group=><article className="sheet" key={group.subject} style={{padding:20,border:"1px solid #dce5f7",borderRadius:16,background:"#fff"}}><h3>{group.subject}</h3>{group.items.map(([name,formula])=><p key={name} style={{borderBottom:"1px solid #edf0f7",paddingBottom:10}}><strong>{name}</strong><br/><span style={{fontSize:14}}>{formula}</span></p>)}</article>)}</div>
  <p className="noPrint"><button onClick={()=>window.print()} style={{background:"#315cf5",color:"white",padding:"12px 18px",border:0,borderRadius:12,cursor:"pointer"}}>Print / Save Formula Sheets as PDF</button></p>
  <section style={{marginTop:36}}><h2>✅ Printable Syllabus Tracker</h2><p>Tick completed topics, then print or save this checklist as a PDF. This is an editable starter template, not an official board-specific syllabus.</p><p><strong>Progress: {done.length} / {chapters.length}</strong></p><div className="sheet" style={{border:"1px solid #dce5f7",borderRadius:16,padding:18}}>{chapters.map(item=><label key={item} style={{display:"flex",gap:12,padding:"10px 4px",borderBottom:"1px solid #eee"}}><input type="checkbox" checked={done.includes(item)} onChange={()=>toggle(item)}/><span>{item}</span></label>)}</div><p className="noPrint"><button onClick={()=>window.print()} style={{background:"#14213d",color:"white",padding:"12px 18px",border:0,borderRadius:12,cursor:"pointer"}}>Download Tracker (Print / Save as PDF)</button></p></section>
  <footer style={{marginTop:30,fontSize:13,color:"#526079"}}>Gen-z AI · Free learning resources. Verify formulas and exam-specific syllabus with your textbook and exam authority.</footer>
 </main>;
}