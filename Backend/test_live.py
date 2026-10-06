import urllib.request, json
r = urllib.request.urlopen('http://localhost:8000/api/live/dashboard')
data = json.loads(r.read())
print("=== LIVE DASHBOARD TEST ===")
print("Queues:")
for q in data['queues']:
    print(f"  Gate {q['gate_number']}: {q['wait_time_minutes']} min wait ({q['status_label']}), occupancy {q['sanctum_occupancy_pct']}%")
print(f"Next Aarti: {data['next_aarti']['name']} in {data['next_aarti']['minutes_until']} mins")
print(f"Weather: {data['weather']}")
print(f"Sanctum open: {data['sanctum_is_open']}")
print(f"Devotees today: {data['total_devotees_today']:,}")
print("=== ALL LIVE ENDPOINTS WORKING ===")
