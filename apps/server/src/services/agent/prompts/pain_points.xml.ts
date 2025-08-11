export const PAIN_POINTS_XML = `
<Task name="PainPoints">
  <Goal>Extract concrete client pain points</Goal>
  <Guidance>
    <G1>Prefer explicit complaints, blockers, and unmet needs</G1>
    <G2>Deduplicate and merge similar points</G2>
    <G3>Estimate severity (1-5) and confidence (0-1)</G3>
    <G4>Include short supporting quote when possible</G4>
  </Guidance>
  <Output>
    Return JSON: { "painPoints": [ { "painPoint": string, "category": string, "severity": 1-5, "confidence": 0-1, "quote": string } ] }
  </Output>
</Task>`; 