from llm_module.llm_feedback import generate_feedback

sample_transcript = "I am a hardworking person. I have good communication skills and I am excited to join this company."

result = generate_feedback(sample_transcript, category="HR")

print(result)
