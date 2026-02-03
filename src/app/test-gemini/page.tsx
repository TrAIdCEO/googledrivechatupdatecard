'use client';
import { useState } from 'react';
import { getGenerativeModel } from "firebase/ai";
import { AI } from "@/lib/firebase";

export default function GeminiTestPage() {
  const [output, setOutput] = useState<string>("Ready to test...");
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    setOutput("Connecting to Vertex AI...");
    
    try {
      console.log("Starting Vertex AI test...");
      // 1. Get the model
      console.log("Getting model: gemini-2.5-flash-lite");
      const model = getGenerativeModel(AI, { model: "gemini-2.5-flash-lite" });
      
      // 2. prompt
      console.log("Generating content...");
      const result = await model.generateContent("Explain why the sky is blue in one sentence.");
      console.log("Result received", result);
      const response = await result.response;
      console.log("Response text:", response.text());
      
      setOutput(response.text());
    } catch (error: unknown) {
      console.error("Vertex AI Error:", error);
      if (error instanceof Error) {
        setOutput(`Error: ${error.message} \n\nCheck console for details.`);
      } else {
        setOutput(`Error: An unknown error occurred. \n\nCheck console for details.`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif' }}>
      <h1>Vertex AI Connection Test</h1>
      <button 
        onClick={runTest} 
        disabled={loading}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        {loading ? "Running..." : "Test Connection"}
      </button>
      <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '5px' }}>
        <strong>Output:</strong>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{output}</pre>
      </div>
    </div>
  );
}