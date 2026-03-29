import OpenAI from 'openai'

const openai = new OpenAI()

interface AISummaryResult {
  summary: string
  actionItems: { task: string; assignee: string; priority: string }[]
  sopGuide: string
}

export async function generateSummary(transcript: string, recordingTitle: string): Promise<AISummaryResult> {
  const systemPrompt = `You are an expert at analyzing screen recordings and meetings. You receive a transcript and produce three outputs:

1. SUMMARY: 2-4 paragraph summary of what happened. Focus on decisions, topics, key info. Past tense.

2. ACTION ITEMS: JSON array with "task", "assignee" (or "Unassigned"), "priority" (high/medium/low). Only genuine action items.

3. SOP GUIDE: Markdown step-by-step guide. Numbered steps, prerequisites at top. If meeting (not process/demo): "Not applicable - this is a meeting, not a process demonstration."

Respond in this exact JSON format:
{"summary": "...", "actionItems": [{"task": "...", "assignee": "...", "priority": "..."}], "sopGuide": "..."}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    max_tokens: 4096,
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Recording title: "${recordingTitle}"\n\nTranscript:\n${transcript}` },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('Empty AI response')
  }

  const parsed = JSON.parse(content) as AISummaryResult
  return parsed
}
