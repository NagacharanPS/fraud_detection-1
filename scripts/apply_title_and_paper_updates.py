import re

# Read files
with open('scripts/build_full_report.py', 'r', encoding='utf-8') as f:
    bld = f.read()

with open('scripts/append_chapters.py', 'r', encoding='utf-8') as f:
    app = f.read()

# Old Title:
# "UPI PayGuard: An AI and Graph-Based System for Real-Time\nFraud Detection and Prevention in Financial Networks"
# "UPI PayGuard: An AI and Graph-Based System for Real-Time Fraud Detection and Prevention in Financial Networks"
# New Title:
# "A Graph-Based System for Detecting Suspicious Transactions in Financial Networks"

NEW_TITLE = "A Graph-Based System for Detecting Suspicious Transactions in Financial Networks"
NEW_TITLE_SPLIT = "A Graph-Based System for Detecting Suspicious Transactions\nin Financial Networks"

bld = bld.replace("“UPI PayGuard: An AI and Graph-Based System for Real-Time\\nFraud Detection and Prevention in Financial Networks”", f"“{NEW_TITLE_SPLIT}”")
bld = bld.replace("“UPI PayGuard: An AI and Graph-Based System for Real-Time Fraud Detection and Prevention in Financial Networks”", f"“{NEW_TITLE}”")
bld = bld.replace("UPI PayGuard AI - Unified Three-Tier System Architecture", "Proposed System - Unified Three-Tier System Architecture")
bld = bld.replace("UPI PayGuard Transaction Lifecycle & Adaptive Risk State Machine", "Transaction Lifecycle & Adaptive Risk State Machine")
bld = bld.replace("UPI PayGuard AI vs Conventional Platforms", "Proposed Graph-Based System vs Conventional Platforms")
bld = bld.replace("vs Pure Deep Learning vs UPI PayGuard", "vs Pure Deep Learning vs Proposed System")
bld = bld.replace("UPI PayGuard AI", "the Proposed Graph-Based System")
bld = bld.replace("UPI PayGuard", "the Graph-Based Detection System")

app = app.replace("“UPI PayGuard: An AI and Graph-Based System for Real-Time Fraud Detection and Prevention in Financial Networks”", f"“{NEW_TITLE}”")
app = app.replace("“UPI PayGuard AI”", f"“{NEW_TITLE}”")
app = app.replace("UPI PayGuard AI - Unified Three-Tier System Architecture", "Proposed System - Unified Three-Tier System Architecture")
app = app.replace("UPI PayGuard Transaction Lifecycle & Adaptive Risk State Machine", "Transaction Lifecycle & Adaptive Risk State Machine")
app = app.replace("UPI PayGuard AI vs Conventional Platforms", "Proposed Graph-Based System vs Conventional Platforms")
app = app.replace("vs Pure Deep Learning vs UPI PayGuard", "vs Pure Deep Learning vs Proposed System")
app = app.replace("UPI PayGuard AI", "the Proposed Graph-Based System")
app = app.replace("UPI PayGuard", "the Graph-Based Detection System")

# Update Reference [16] to the new title and authors
app = app.replace(
    "“An AI and Graph-Based Adaptive Framework for Real-Time UPI Fraud Detection, Prevention, and Biometric Step-Up Attestation,”",
    "“A Graph-Based System for Detecting Suspicious Transactions in Financial Networks,”"
)

# Also ensure reference to the conference paper is cleanly listed
conf_ref = (
    "\n        \"[17] Nagacharan P S, Naren N, and Mallaiah Sai Kiran, “AI-Driven UPI Fraud Detection Using Behavioral, "
    "Temporal, Device, and Transaction Features,” Sri Venkateshwara College of Engineering, Bangalore, 2026.\""
)
if "[17]" not in app:
    app = app.replace(
        "[16] Rajesh S, Nagacharan P S, Saikiran M, Naren N, and Yashpal Singh, “A Graph-Based System for Detecting Suspicious Transactions in Financial Networks,” Sri Venkateshwara College of Engineering, Research Publication, 2026.\"",
        "[16] Rajesh S, Nagacharan P S, Saikiran M, Naren N, and Yashpal Singh, “A Graph-Based System for Detecting Suspicious Transactions in Financial Networks,” Sri Venkateshwara College of Engineering, Research Publication, 2026.\"," + conf_ref
    )

with open('scripts/build_full_report.py', 'w', encoding='utf-8') as f:
    f.write(bld)

with open('scripts/append_chapters.py', 'w', encoding='utf-8') as f:
    f.write(app)

print("Title and system name replacements applied successfully!")
