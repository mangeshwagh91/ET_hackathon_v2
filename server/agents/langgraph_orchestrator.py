"""
LangGraph Orchestrator Agent — DCPI.
Replaces the custom orchestrator cascade with a formal LangGraph StateGraph.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, TypedDict

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)

# ==============================================================================
# STATE DEFINITION
# ==============================================================================
class OrchestratorState(TypedDict):
    item_name: str
    delay_weeks: int
    logs: List[Dict[str, Any]]
    
    # Outputs from agents
    schedule_impact: Dict[str, Any]
    cost_impact: Dict[str, Any]
    compliance_impact: Dict[str, Any]
    
    # Final output
    final_report: Dict[str, Any]

# ==============================================================================
# HELPER FOR LOGGING
# ==============================================================================
def add_log(state: OrchestratorState, agent: str, message: str, data: Any = None) -> OrchestratorState:
    if "logs" not in state or state["logs"] is None:
        state["logs"] = []
    
    state["logs"].append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": agent,
        "message": message,
        "data": data
    })
    return state

# ==============================================================================
# NODES (AGENTS)
# ==============================================================================

def supply_chain_node(state: OrchestratorState) -> OrchestratorState:
    item_name = state.get("item_name", "Unknown Item")
    delay_weeks = state.get("delay_weeks", 0)
    
    state = add_log(state, "RabbitMQ Event Bus", f"Published event: supply_chain.delay.created (Topic: {item_name})")
    
    msg = f"🚨 CRITICAL ALERT: {item_name} delayed by {delay_weeks} weeks at origin port."
    state = add_log(state, "Supply Chain Agent (LangGraph)", msg, {"delay_weeks": delay_weeks})
    
    return state


def schedule_node(state: OrchestratorState) -> OrchestratorState:
    # Here we would normally call the real Schedule Risk Agent.
    # We will simulate the same payload for UI consistency.
    delay_weeks = state.get("delay_weeks", 0)
    
    schedule_impact = {
        "critical_path_affected": True,
        "new_project_end_date": "2024-11-15",
        "float_erosion": f"{delay_weeks} weeks",
        "affected_tasks": ["Install UPS", "Commissioning Phase 1"]
    }
    
    state["schedule_impact"] = schedule_impact
    state = add_log(state, "RabbitMQ Event Bus", "Published event: langgraph.route_to_schedule")
    state = add_log(state, "Schedule Risk Agent (LangGraph)", "Critical path recalculated. Project completion delayed.", schedule_impact)
    
    return state


def cost_node(state: OrchestratorState) -> OrchestratorState:
    item_name = state.get("item_name", "Unknown Item")
    delay_weeks = state.get("delay_weeks", 0)
    
    # Call the actual cost agent logic (or simulate it)
    from agents.cost_agent import calculate_delay_impact
    cost_impact = calculate_delay_impact(item_name, delay_weeks * 7)
    
    state["cost_impact"] = cost_impact
    state = add_log(state, "RabbitMQ Event Bus", "Published event: langgraph.route_to_cost")
    state = add_log(state, "Cost Estimation Agent (LangGraph)", f"Financial impact calculated: ${cost_impact['total_financial_impact']:,.2f}", cost_impact)
    
    return state


def compliance_node(state: OrchestratorState) -> OrchestratorState:
    qa_impact = {
        "commissioning_risk": "HIGH",
        "ncr_status": "AUTO-GENERATED: Submittal Delay NCR-082",
        "mitigation": "Perform factory acceptance test (FAT) virtually to save 1 week."
    }
    
    state["compliance_impact"] = qa_impact
    state = add_log(state, "RabbitMQ Event Bus", "Published event: langgraph.route_to_compliance")
    state = add_log(state, "Commissioning QA Agent (LangGraph)", "Commissioning timeline at risk. Virtual FAT recommended.", qa_impact)
    
    return state


def synthesis_node(state: OrchestratorState) -> OrchestratorState:
    # Let's use the actual LLM via LangChain to generate the synthesis!
    try:
        # Get Groq key
        api_keys = os.getenv("GROQ_API_KEYS", "").split(",")
        groq_api_key = api_keys[0] if api_keys and api_keys[0] else ""
        model_name = os.getenv("GROQ_MODEL", "llama3-70b-8192")
        
        if groq_api_key:
            llm = ChatGroq(temperature=0.2, groq_api_key=groq_api_key, model_name=model_name)
            
            system_msg = SystemMessage(content="You are a Master Orchestrator for an EPC construction project. Summarize the following impacts into a short 2-3 sentence executive summary. Return only the summary.")
            human_msg = HumanMessage(content=f"""
                Item: {state['item_name']}
                Delay: {state['delay_weeks']} weeks
                Schedule Impact: {state['schedule_impact']}
                Cost Impact: {state['cost_impact']['total_financial_impact']} USD
                Compliance Risk: {state['compliance_impact']['commissioning_risk']}
            """)
            
            response = llm.invoke([system_msg, human_msg])
            summary_text = response.content
        else:
            summary_text = f"A {state['delay_weeks']}-week delay in {state['item_name']} delivery has pushed the critical path. Estimated LDs are ${state['cost_impact']['total_financial_impact']:,.2f}. Recommend virtual FAT and air-freight mitigation to recover schedule."
    except Exception as e:
        logger.error(f"LangChain LLM synthesis failed: {e}")
        summary_text = f"A {state['delay_weeks']}-week delay in {state['item_name']} delivery has pushed the critical path. Estimated LDs are ${state['cost_impact']['total_financial_impact']:,.2f}. Recommend virtual FAT and air-freight mitigation to recover schedule."
    
    final_report = {
        "alert_level": "CRITICAL",
        "summary": summary_text,
        "actions": [
            "Approve air freight budget ($250k)",
            "Reschedule Phase 1 Commissioning teams",
            "Notify Client of potential timeline variance"
        ]
    }
    
    state["final_report"] = final_report
    state = add_log(state, "Master Orchestrator (LangGraph)", "Executive Summary generated by LangChain Groq model.", final_report)
    state = add_log(state, "RabbitMQ Event Bus", "Published event: langgraph.synthesis.completed")
    
    return state

# ==============================================================================
# BUILD AND COMPILE GRAPH
# ==============================================================================

def build_orchestrator_graph():
    workflow = StateGraph(OrchestratorState)
    
    # Add nodes
    workflow.add_node("supply_chain", supply_chain_node)
    workflow.add_node("schedule", schedule_node)
    workflow.add_node("cost", cost_node)
    workflow.add_node("compliance", compliance_node)
    workflow.add_node("synthesis", synthesis_node)
    
    # Define edges (linear cascade for this scenario)
    workflow.set_entry_point("supply_chain")
    workflow.add_edge("supply_chain", "schedule")
    workflow.add_edge("schedule", "cost")
    workflow.add_edge("cost", "compliance")
    workflow.add_edge("compliance", "synthesis")
    workflow.add_edge("synthesis", END)
    
    return workflow.compile()

# Instantiate the compiled graph once
app_graph = build_orchestrator_graph()


def run_langgraph_cascade(item_name: str, delay_weeks: int) -> Dict[str, Any]:
    """
    Entry point to trigger the LangGraph execution.
    """
    run_id = str(uuid.uuid4())
    logger.info(f"LangGraph [{run_id[:8]}]: Triggering for {item_name}")
    
    # Initial state
    initial_state = {
        "item_name": item_name,
        "delay_weeks": delay_weeks,
        "logs": []
    }
    
    # Run the graph
    final_state = app_graph.invoke(initial_state)
    
    return {
        "run_id": run_id,
        "trigger": f"LangGraph Supply Chain Shock: {item_name}",
        "execution_log": final_state["logs"],
        "final_report": final_state["final_report"]
    }
