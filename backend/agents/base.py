from backend.prompt_compiler import compile_agent_prompt
from backend.ai_service import chat_completion, chat_completion_stream


class BaseAgent:
    def __init__(self, agent_name, model_type="quick"):
        self.agent_name = agent_name
        self.model_type = model_type
        self.system_prompt = compile_agent_prompt(agent_name)

    def execute(self, task_prompt):
        return chat_completion(self.system_prompt, task_prompt, self.model_type)

    async def execute_stream(self, task_prompt):
        async for chunk in chat_completion_stream(self.system_prompt, task_prompt, self.model_type):
            yield chunk
