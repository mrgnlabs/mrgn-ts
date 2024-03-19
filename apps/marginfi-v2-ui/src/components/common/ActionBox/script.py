# Let's parse the provided JSON and reformat it according to the user's request
import json

# Load the JSON data
with open('/mnt/data/test2.json') as file:
    data = json.load(file)

# Reformat the data
reformatted_data = {}

for item in data:
    minta = item['minta']
    mintb = item['mintb']
    if minta not in reformatted_data:
        reformatted_data[minta] = {"directRoutes": []}
    reformatted_data[minta]["directRoutes"].append(mintb)

# Prepare a small sample to display as it might be too large to show entirely
sample_output = {k: reformatted_data[k] for k in list(reformatted_data)[:3]}

sample_output
