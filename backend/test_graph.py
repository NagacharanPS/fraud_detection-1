from services.graph_detector import GraphDetector
from config import TRANSACTIONS_FILE

print("Program Started")

detector = GraphDetector(TRANSACTIONS_FILE)

print("Graph Loaded")

print("Running Rapid")
rapid = detector.detect_rapid_transactions()
print("Rapid Done:", len(rapid))

print("Running FanOut")
fanout = detector.detect_fan_out()
print("FanOut Done:", len(fanout))

print("Running FanIn")
fanin = detector.detect_fan_in()
print("FanIn Done:", len(fanin))

print("Finished")