export const COACH_SALES_XML = `
<Task name="CoachSales">
  <Goal>Provide immediate coaching for salesperson utterances</Goal>
  <Guidance>
    <G1>Flag risky claims, vague promises, pressure tactics</G1>
    <G2>Suggest clearer, customer-centric phrasing</G2>
    <G3>Encourage discovery questions and empathy</G3>
    <G4>Maintain compliance; avoid legal/medical/financial guarantees</G4>
  </Guidance>
  <Output>
    Return JSON: { "warnings": string[], "suggestions": string[], "doSay": string[], "dontSay": string[], "citations"?: [{"title": string, "url": string}] }
  </Output>
</Task>`; 