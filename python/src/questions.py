# Each key is something the customer can ask the agent to do.
# The key is the action name Node runs. Add more entries here.
# Shortlist keeps the closest 20 when this list grows past that.
#
# `need` is one choice, so it can return only one of these actions.
# Customers often ask for several things in one sentence (refund and return
# and a ticket). A choice drops the rest. Later, most of these actions will
# become their own noul questions so each can be true at once. The agent will
# loop over those answers and run an action only when its confidence is high
# enough. Do not keep the same action both here and as a noul; the two answers
# would conflict.

SHORTLIST_K = 20
MIN_NEED_CONF = 0.8

THINGS_TO_DO = {
    "reply": "they want an answer or an explanation in the chat",
    "order_status": "where an order is, or whether it has shipped or arrived",
    "refund": "money back for a charge or an order",
    "cancel": "stop an order or a subscription",
    "replace": "a replacement for a broken, missing, or wrong item",
    "account": "sign-in, password, or account access",
    "follow_up": "something done that needs a person to follow up, and none of the specific actions above",
    "other": "unclear",
}

# Asked on every message.
SHARED_QUESTIONS = {
    "need": {
        "type": "choice",
        "instructions": "What is the customer asking support to do?",
        "criteria": THINGS_TO_DO,
    },
    "urgency": {
        "type": "score",
        "instructions": "How urgent is this request?",
        "criteria": ["not urgent", "soon", "critical or blocking"],
    },
    "language": {
        "type": "choice",
        "instructions": "What language should the reply use?",
        "criteria": {
            "english": "the customer is writing in English",
            "arabic": "the customer is writing in Arabic",
            "french": "the customer is writing in French",
            "spanish": "the customer is writing in Spanish",
            "other": "any other language",
        },
    },
    "upset": {
        "type": "noul",
        "instructions": "Is the customer upset or complaining?",
    },
}

# Asked only after `need` matches the key. Question ids must not repeat shared ids.
SCENARIOS = {
    "order_status": {
        "not_arrived": {
            "type": "noul",
            "instructions": "Is the customer saying the order has not arrived?",
        },
    },
    "refund": {
        "refund_reason": {
            "type": "choice",
            "instructions": "Why does the customer want a refund?",
            "criteria": {
                "duplicate": "charged more than once",
                "not_received": "order or item never arrived",
                "wrong_item": "wrong or defective item",
                "other": "any other reason",
            },
        },
    },
    "cancel": {
        "already_shipped": {
            "type": "noul",
            "instructions": "Has the order already shipped?",
        },
    },
    "replace": {
        "defective": {
            "type": "noul",
            "instructions": "Is the item broken or defective?",
        },
    },
    "account": {
        "locked_out": {
            "type": "noul",
            "instructions": "Can the customer not sign in?",
        },
    },
    "follow_up": {
        "blocked": {
            "type": "noul",
            "instructions": "Is the customer blocked until support acts?",
        },
    },
}
