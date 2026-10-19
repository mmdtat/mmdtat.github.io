import os
import re
import json

deploy_dir = r"d:\Алексей\02_Сферы_жизни\MMDT_AT\Deploy"
fest_html_path = os.path.join(deploy_dir, "CITyrolFest2026.html")

with open(fest_html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Extract Hero data
title_match = re.search(r'<h1 class="fest-hero-title">(.*?)</h1>', html)
title = title_match.group(1).replace('&amp;', '&').strip() if title_match else "SOLO & CI TIROL Fest 2026"

subtitle_match = re.search(r'<p class="fest-hero-subtitle">(.*?)</p>', html)
subtitle = subtitle_match.group(1).replace('&ldquo;', '“').replace('&rdquo;', '”').strip() if subtitle_match else ""

author_match = re.search(r'<p class="fest-hero-author">(.*?)</p>', html)
topic_author = author_match.group(1).strip() if author_match else ""

tag_match = re.search(r'<span class="fest-hero-tag">(.*?)</span>', html)
dates_tag = tag_match.group(1).replace('&middot;', '·').strip() if tag_match else ""

hero_bg_match = re.search(r'background-image:\s*url\([\'"]?(.*?)[\'"]?\)', html)
hero_bg = hero_bg_match.group(1).strip() if hero_bg_match else "img/festivals/2026/bg.jpg"

# Extract Quick Facts
fact_labels = re.findall(r'<span class="fest-fact-label">(.*?)</span>\s*<span class="fest-fact-value">(.*?)</span>\s*<span class="fest-fact-sub">(.*?)</span>', html)
quick_facts = {}
if fact_labels:
    quick_facts["dates"] = fact_labels[0][1].replace('&uuml;', 'ü').strip()
    if len(fact_labels) > 1:
        quick_facts["location"] = f"{fact_labels[1][1]}, {fact_labels[1][2]}".replace('&uuml;', 'ü').strip()
    if len(fact_labels) > 2:
        quick_facts["teachers"] = f"{fact_labels[2][1]}, {fact_labels[2][2]}".strip()
    if len(fact_labels) > 3:
        quick_facts["format"] = f"{fact_labels[3][1]} · {fact_labels[3][2]}".replace('&amp;', '&').strip()

# Overview manifesto
man_title_match = re.search(r'<h2 class="manifesto-title">\s*(.*?)\s*</h2>', html, re.DOTALL)
manifesto_title = re.sub(r'\s+', ' ', man_title_match.group(1)).strip() if man_title_match else ""

concept_blocks = [
    {
        "label": "01 / Physical & Philosophical Practice",
        "text": "In 2026, we look at Contact Improvisation as both a physical and philosophical practice — balancing between stability and flight, weight and suspension, presence and risk. Through movement, conversation, and shared reflection, we ask:\nWhat does it mean to be grounded — as artists, as humans, as communities — and what happens when we let go of the ground?\n\nThis year’s program expands CI into new terrains — literally. Participants will have the opportunity to explore movement on the rock with a belay system, discovering new ways to connect gravity and improvisation in nature."
    },
    {
        "label": "02 / Spaces for Dialogue",
        "text": "Beyond physical practice, the festival continues to open spaces for dialogue. We will host open talks with invited artists such as Pedro Penuela and Sarah Sea, who will lead conversations around sexuality, gender, identity, and body politics, inviting multiple perspectives on how we relate, move, and create together.\n\nMotion Mode of Dialogue continues to be a space where art, movement, and social reflection meet — a place for connection, questioning, and discovery.\n\nJoin us for this journey between earth and air, grounding and flight, body and idea."
    }
]

highlights = [
    "Daily CI classes, labs, and research sessions, jams with live music",
    "Teachers’ performances and improvisation events",
    "Dance screenings and lectures",
    "Open discussions",
    "Shared meals and informal gatherings in the heart of the Tirol mountains."
]

# Registration
reg_passes = [
    {
        "label": "Full Week Pass · Aug 21–28",
        "title": "Regular participation:",
        "desc": "(without accommodation and meals)",
        "price_old": "399 €",
        "price_current": "365 €",
        "url": "https://buy.stripe.com/14A28r5pK4YUaCU9jEd3i0V",
        "is_soldout": True
    },
    {
        "label": "Half Pass",
        "title": "Half of the festival regular participation:",
        "desc": "(without accommodation and meals)",
        "price_old": "349 €",
        "price_current": "315 €",
        "url": "https://buy.stripe.com/14A3cvbO8ezubGY8fAd3i0W",
        "is_soldout": True
    },
    {
        "label": "0 places left",
        "title": "HELPER",
        "desc": "(without accommodation and meals)",
        "price_old": "",
        "price_current": "0 places left",
        "url": "",
        "is_soldout": True
    }
]

# Parse Teachers
teachers = [
    {
        "name": "Maitane Sarralde",
        "role": "Core Teacher",
        "photo": "img/festivals/2026/Sarralde.jpg",
        "topic": "Suspension, Weight and Flight",
        "bio": "Maitane Sarralde is a creator and performer specializing in vertical dance, suspension, and contemporary movement research.",
        "video_url": "https://www.youtube.com/embed/5-9a_N20x6Y"
    },
    {
        "name": "Pedro Penuela",
        "role": "Core Teacher",
        "photo": "img/festivals/2026/Penuela.jpg",
        "topic": "Somatic Navigation & Flying CI",
        "bio": "Pedro Penuela integrates somatic psychology and relational Contact Improvisation, focusing on weight sharing, touch, and boundary navigation.",
        "video_url": "https://www.youtube.com/embed/bN5nF5bEaV8"
    },
    {
        "name": "Charlie Morrissey",
        "role": "Core Teacher",
        "photo": "img/festivals/2026/Morrissey.jpg",
        "topic": "Perception, Space and Gravity",
        "bio": "Charlie Morrissey has been dancing, performing, and teaching internationally for over 30 years, exploring the ecology of perception in movement.",
        "video_url": ""
    },
    {
        "name": "Sarah Sea Clarke",
        "role": "Core Teacher",
        "photo": "img/festivals/2026/Sarah_Sea_Clarke.jpg",
        "topic": "Body Politics, Gender & CI Dialogue",
        "bio": "Sarah Sea Clarke brings an engaged sociopolitical approach to Contact Improvisation, examining inclusivity, queer identity, and touch cultures.",
        "video_url": ""
    }
]

# Parse Performances
performances = [
    {
        "title": "Hacer Sonar El Aire",
        "date_time": "August 23, 2026 · 18:00",
        "venue": "Innsbruck City Tower (Stadtturm)",
        "artists": "Maitane Sarralde",
        "desc": "A breathtaking vertical dance performance on the medieval facade of the Innsbruck City Tower, interacting with architecture, wind, and audience gaze.",
        "video_url": "",
        "ticket_info": "Free public outdoor performance"
    },
    {
        "title": "Grounding – Off Ground",
        "date_time": "August 26, 2026 · 20:00",
        "venue": "WEISSRAUM Gallery",
        "artists": "Festival Faculty & Artists",
        "desc": "An experimental improvisation performance exploring themes of terrestrial contact and weightlessness within the minimalist white-cube space of WEISSRAUM.",
        "video_url": "",
        "ticket_info": "Reservation required at info@mmdt.at"
    }
]

# Parse Musicians
musicians = [
    {
        "name": "Dima Bondarev",
        "role": "Trumpet & Live Electronics",
        "photo": "img/festivals/2026/Bondarev.jpg",
        "bio": "Berlin-based jazz trumpet player and improviser exploring microtonal textures, acoustic resonance, and live electronics."
    },
    {
        "name": "Christian Prader",
        "role": "Flutes & Multi-instrumentalist",
        "photo": "img/festivals/2026/Prader.jpg",
        "bio": "Austrian wind instrument virtuoso weaving ancient and contemporary soundscapes for movement jams."
    },
    {
        "name": "Joshua Meyer",
        "role": "Percussion & Sound Design",
        "photo": "img/festivals/2026/Meyer.jpg",
        "bio": "Organic percussionist blending frame drums, handpans, and field recordings."
    }
]

# Program
program = {
    "intro": "The festival week follows an organic flow balancing rigorous physical morning labs, communal midday nourishment, contemplative afternoon dialogues, and evening jams accompanied by live musicians.",
    "schedule": [
        { "time": "08:30 – 09:30", "title": "Somatic Awakening & Meditation" },
        { "time": "10:00 – 13:00", "title": "Morning CI Masterclasses with Faculty" },
        { "time": "13:00 – 15:00", "title": "Warm Vegetarian Lunch & Rest" },
        { "time": "15:00 – 17:30", "title": "Afternoon Research Labs & Rock CI with Belay" },
        { "time": "18:00 – 19:30", "title": "Screenings, Body Politics Talks & Discussions" },
        { "time": "20:00 – 23:00", "title": "Open Jam with Live Music & Sound Explorations" }
    ]
}

# Venue & Food
venue_food = {
    "venue_name": "Künstlerhaus Büchsenhausen",
    "venue_address": "Weiherburggasse 13, 6020 Innsbruck, Austria",
    "venue_desc": "Located on the slope of the Nordkette mountains just above the old town of Innsbruck, Künstlerhaus Büchsenhausen offers light-flooded studios, wooden sprung floors, and historic Alpine architecture.",
    "venue_photos": [
        "img/festivals/2026/buchsenhausen.jpg"
    ],
    "accommodation_info": "Innsbruck offers a wide range of hostels, apartments, and camp sites. We also coordinate a community hosting network where local dancers host visiting festival participants.",
    "food_chef": "Communal Meals by Maya Schwartz",
    "food_desc": "Maya Schwartz prepares fresh, nourishing, 100% vegetarian and vegan meals using organic produce sourced directly from Tirolean farmers.",
    "food_photos": []
}

# Team & Partners
team_partners = {
    "team": [
        {
            "name": "Tamara Maksymenko",
            "role": "Artistic Director & Project Lead",
            "photo": "img/team/tamara.jpg",
            "bio": "Founder of Motion Mode of Dialogue in Tirol, choreographer, and somatic educator."
        },
        {
            "name": "Serhii Semichev",
            "role": "Documentary Photographer & Media Curator",
            "photo": "img/team/serhii.jpg",
            "bio": "Renowned dance photographer capturing the ephemeral moments of contact improvisation across Europe."
        }
    ],
    "partners": [
        { "name": "Land Tirol Kultur", "logo": "img/partners/land_tirol.png", "url": "https://www.tirol.gv.at" },
        { "name": "Stadt Innsbruck", "logo": "img/partners/stadt_innsbruck.png", "url": "https://www.innsbruck.gv.at" },
        { "name": "Künstlerhaus Büchsenhausen", "logo": "img/partners/buchsenhausen.png", "url": "https://www.buchsenhausen.at" },
        { "name": "WEISSRAUM", "logo": "img/partners/weissraum.png", "url": "https://www.weissraum.at" }
    ]
}

# Archive
archive = {
    "videos": [
        "https://www.youtube.com/embed/GY5zSOqG1iE?si=kxRxyxudUggpM5nT",
        "https://www.youtube.com/embed/GRJLxgUjeSo?si=Cl2nZFiAc7BYnAro"
    ],
    "audio_link": "https://drive.google.com/drive/folders/13PwpPQzcbjgH9QApOGtA1S4BHRDBfTSs",
    "photographer": "Photo by Serhii Semichev",
    "photos": [
        "img/festivals/2026/archive/5R7A9054_compress.jpg",
        "img/festivals/2026/archive/5R7A9060_compress.jpg",
        "img/festivals/2026/archive/5R7A9071-2_compress.jpg",
        "img/festivals/2026/archive/5R7A9077_compress.jpg",
        "img/festivals/2026/archive/5R7A9029-2_compress.jpg",
        "img/festivals/2026/archive/5R7A9030 1_compress.jpg",
        "img/festivals/2026/archive/5R7A9035_compress.jpg"
    ]
}

fest_data = {
    "id": "fest-2026",
    "title": "SOLO & CI TIROL Fest",
    "year": "2026",
    "url": "CITyrolFest2026.html",
    "image": "../img/festivals/covers/CI_2026.jpg",
    "dates": dates_tag,
    "subtitle": subtitle,
    "topic_author": topic_author,
    "hero_bg": hero_bg,
    "status": "archived",
    "overview": {
        "quick_facts": quick_facts,
        "manifesto_tag": "Festival 2026 · August 21st to 28th, 2026",
        "manifesto_title": manifesto_title,
        "concept_blocks": concept_blocks,
        "highlights": highlights,
        "conclusion": "Motion Mode of Dialogue continues to be a space where art, movement, and social reflection meet — a place for connection, questioning, and discovery.\n\nJoin us for this journey between earth and air, grounding and flight, body and idea."
    },
    "registration": {
        "is_closed": True,
        "closed_notice": "Registration is now officially closed. Thank you for your interest in our festival!",
        "whatsapp_contact": "+43 677 630 27506",
        "intro_text": "A full week of classes, performances, jams, and lectures was offered at an incredibly low price — only €305 (without accommodation and meals). This is roughly the cost of a two-day retreat!",
        "passes": reg_passes,
        "helper": {
            "title": "Special Participation: HELPER",
            "desc": "Join our community in a unique way! This special participation lets you reduce costs by contributing your hands. In exchange, you’ll help with tasks like cleaning, organizing, and keeping the space welcoming for everyone.",
            "status_note": "Helper spots are now fully booked! 🙏"
        },
        "support": {
            "title": "Support the Festival 🤍",
            "text": "Being an independent community festival, every gesture of support and solidarity enables scholarships and reduced ticket passes for dancers in need."
        }
    },
    "teachers": teachers,
    "performances": performances,
    "musicians": musicians,
    "program": program,
    "venue_food": venue_food,
    "team_partners": team_partners,
    "archive": archive
}

out_path = os.path.join(deploy_dir, "data", "festivals", "CITyrolFest2026.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(fest_data, f, ensure_ascii=False, indent=2)

print("Saved:", out_path)
