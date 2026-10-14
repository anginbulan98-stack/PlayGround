#!/usr/bin/env python3
"""Generate data-anime.js dari anime.json + anikoto.json + tabel metadata.
Satu-satunya sumber edit manual untuk katalog = META di bawah + TOTAL_FIX."""
import json

META = {
# id: (status, kind, year, [genres], sinopsis)
"solo-leveling": ("tayang","series",2024,["Action","Fantasy"],"Hunter terlemah Sung Jinwoo bangkit lewat sistem misterius dan jadi yang terkuat."),
"frieren": ("tayang","series",2023,["Adventure","Fantasy"],"Penyihir elf Frieren berkelana memahami manusia setelah sang pahlawan wafat."),
"jujutsu-kaisen": ("tayang","series",2020,["Action","Supernatural"],"Yuji Itadori menelan jari terkutuk dan masuk ke dunia Jujutsu yang brutal."),
"demon-slayer": ("tayang","series",2019,["Action","Fantasy"],"Tanjiro berburu iblis demi menyembuhkan adiknya Nezuko."),
"one-piece": ("tayang","series",1999,["Action","Adventure"],"Luffy dan kru Topi Jerami berlayar mencari harta One Piece."),
"attack-on-titan": ("tamat","series",2013,["Action","Drama"],"Eren dan pasukan pengintai melawan raksasa pemakan manusia."),
"chainsaw-man": ("tayang","series",2022,["Action","Horror"],"Denji menyatu dengan iblis gergaji dan jadi pemburu iblis."),
"spy-x-family": ("tayang","series",2022,["Comedy","Action"],"Mata-mata, pembunuh, dan esper pura-pura jadi keluarga bahagia."),
"oshi-no-ko": ("tayang","series",2023,["Drama","Mystery"],"Anak kembar idol Ai Hoshino menyimpan rahasia kelam industri hiburan."),
"dan-da-dan": ("tayang","series",2024,["Action","Comedy"],"Dua remaja adu argumen hantu vs alien, lalu keduanya ternyata nyata."),
"re-zero": ("tayang","series",2016,["Fantasy","Drama"],"Subaru terjebak di dunia lain dengan kutukan kembali dari kematian."),
"my-hero-academia": ("tamat","series",2016,["Action","School"],"Deku yang tak berkekuatan mewarisi One For All demi jadi pahlawan."),
"mushoku-tensei": ("tayang","series",2021,["Fantasy","Adventure"],"Pengangguran bereinkarnasi sebagai bocah jenius sihir di dunia baru."),
"overlord": ("tamat","series",2015,["Fantasy","Action"],"Pemain game terjebak sebagai raja mayat hidup Ainz Ooal Gown."),
"kaiju-no-8": ("tayang","series",2024,["Action","Sci-Fi"],"Kafka berubah jadi kaiju dan menyusup ke pasukan pembasmi kaiju."),
"sakamoto-days": ("tayang","series",2025,["Action","Comedy"],"Mantan pembunuh legendaris kini bapak-bapak penjaga toko kelontong."),
"wind-breaker": ("tayang","series",2024,["Action","School"],"Berandalan SMA Furin bertarung melindungi kota dari geng rival."),
"tokyo-revengers": ("tamat","series",2021,["Action","Drama"],"Takemichi melompat ke masa lalu demi menyelamatkan sang kekasih."),
"naruto": ("tamat","series",2002,["Action","Adventure"],"Ninja yatim Naruto mengejar mimpinya jadi Hokage."),
"bleach": ("tamat","series",2004,["Action","Supernatural"],"Ichigo jadi Shinigami pengganti dan berperang antar dimensi roh."),
"death-note": ("tamat","series",2006,["Mystery","Thriller"],"Light menemukan buku yang membunuh siapa pun yang namanya ditulis."),
"one-punch-man": ("tayang","series",2015,["Action","Comedy"],"Saitama terlalu kuat hingga bosan karena selalu menang sekali pukul."),
"mob-psycho-100": ("tamat","series",2016,["Action","Comedy"],"Esper SMP Mob menahan emosinya agar kekuatannya tak meledak."),
"vinland-saga": ("tamat","series",2019,["Action","Drama"],"Thorfinn mengejar balas dendam di era Viking yang kejam."),
"steins-gate": ("tamat","series",2011,["Sci-Fi","Thriller"],"Ilmuwan amatir menemukan cara mengirim pesan ke masa lalu."),
"fullmetal-alchemist-brotherhood": ("tamat","series",2009,["Action","Fantasy"],"Dua alkemis bersaudara mencari Batu Filsuf demi tubuh mereka."),
"hunter-x-hunter": ("tamat","series",1999,["Adventure","Action"],"Gon mengikuti jejak ayahnya menjadi Hunter legendaris."),
"cowboy-bebop": ("tamat","series",1998,["Sci-Fi","Action"],"Pemburu bayaran luar angkasa Spike dan kru Bebop."),
"violet-evergarden": ("tamat","series",2018,["Drama","Fantasy"],"Boneka perang Violet belajar memahami perasaan manusia."),
"your-name": ("tamat","film",2016,["Romance","Fantasy"],"Dua remaja bertukar tubuh melintasi ruang dan waktu."),
"suzume": ("tamat","film",2022,["Adventure","Fantasy"],"Suzume menutup pintu bencana bersama pemuda misterius."),
"a-silent-voice": ("tamat","film",2016,["Drama","Romance"],"Mant pembully menebus dosa pada gadis tunarungu yang dulu disakitinya."),
"gintama": ("tamat","series",2006,["Comedy","Action"],"Samurai kocak Gintoki dan geng Yorozuya di Edo versi alien."),
"march-comes-in-like-a-lion": ("tamat","series",2016,["Drama","Slice of Life"],"Pemain shogi muda menemukan kehangatan keluarga di tepi sungai."),
"magical-girl-raising-project": ("tamat","series",2016,["Action","Thriller"],"16 gadis penyihir dipaksa saling gugur dalam permainan mematikan."),
"dr-stone": ("tamat","series",2019,["Sci-Fi","Adventure"],"Senku membangun kembali peradaban dengan sains setelah umat membatu."),
"black-clover": ("tayang","series",2017,["Action","Fantasy"],"Asta yang tanpa sihir mengejar gelar Kaisar Sihir bermodal pedang anti-sihir."),
"fairy-tail": ("tayang","series",2009,["Action","Fantasy"],"Penyihir muda Lucy bergabung dengan guild petualang Fairy Tail."),
"boruto": ("tayang","series",2017,["Action","Adventure"],"Putra Naruto, Boruto, berjuang keluar dari bayang-bayang ayahnya."),
"blue-lock": ("tayang","series",2022,["Sports","Drama"],"300 striker dikurung demi mencetak striker egois nomor satu Jepang."),
"slam-dunk": ("tamat","series",1993,["Sports","Comedy"],"Preman SMA Hanamichi gabung basket demi cinta, lalu ketagihan."),
"your-lie-in-april": ("tamat","series",2014,["Drama","Music"],"Pianis trauma kembali bermain berkat pemain biola ceria."),
"toradora": ("tamat","series",2008,["Romance","Comedy"],"Berandalan dan si mini galak saling bantu urusan cinta."),
"clannad": ("tamat","series",2007,["Drama","Romance"],"Remaja apatis menemukan makna hidup lewat gadis misterius."),
"made-in-abyss": ("tayang","series",2017,["Adventure","Fantasy"],"Riko turun ke jurang raksasa Abyss mencari ibunya."),
"psycho-pass": ("tamat","series",2012,["Sci-Fi","Thriller"],"Polisi masa depan memburu kriminal lewat skor psikologis."),
"erased": ("tamat","series",2016,["Mystery","Thriller"],"Satoru melompat ke masa kecil demi mencegah penculikan berantai."),
"anohana": ("tamat","series",2011,["Drama","Supernatural"],"Hantu kawan masa kecil menyatukan kembali geng yang tercerai."),
"code-geass": ("tamat","series",2006,["Mecha","Thriller"],"Pangeran buangan Lelouch memimpin pemberontakan dengan kekuatan Geass."),
"evangelion": ("tamat","series",1995,["Mecha","Drama"],"Remaja Shinji dipaksa mengendalikan robot raksasa melawan Angel."),
"samurai-champloo": ("tamat","series",2004,["Action","Adventure"],"Dua samurai nyentrik mengawal gadis mencari samurai berbau bunga matahari."),
"inuyasha": ("tamat","series",2000,["Fantasy","Romance"],"Gadis SMA terlempar ke era Sengoku dan bertualang dengan siluman anjing."),
"spirited-away": ("tamat","film",2001,["Fantasy","Adventure"],"Chihiro bekerja di pemandian roh demi membebaskan orang tuanya."),
"howl-s-moving-castle": ("tamat","film",2004,["Fantasy","Romance"],"Gadis yang dikutuk jadi nenek tinggal di kastil berjalan penyihir Howl."),
"jujutsu-kaisen-season-2": ("tayang","series",2023,["Action","Supernatural"],"Masa lalu Gojo dan tragedi Shibuya yang mengubah segalanya."),
"haikyuu-to-the-top": ("tayang","series",2020,["Sports","Drama"],"Tim voli Karasuno menantang turnamen nasional."),
"kuroko-s-basketball": ("tamat","series",2012,["Sports","Drama"],"Bayangan keenam Kiseki no Sedai membangun tim dari nol."),
"rurouni-kenshin-2023": ("tayang","series",2023,["Action","Drama"],"Mantan pembunuh Kenshin mengembara menebus masa lalu dengan pedang tumpul."),
"oshi-no-ko-season-2": ("tayang","series",2024,["Drama","Mystery"],"Arc panggung teater mengungkap masa lalu Ai dan dendam Aqua."),
}
# Total episode sebenarnya (melebihi file embed → sisanya berlabel "Segera hadir")
TOTAL_FIX = {
"solo-leveling": 25,
"spy-x-family": 25,
"kaiju-no-8": 23,
"sakamoto-days": 22,
"wind-breaker": 25,
"dan-da-dan": 24,
}

anime = json.load(open("data/anime.json"))
ak = json.load(open("data/anikoto.json"))
akid = {o["show"]: o["id"] for o in ak if o.get("id")}
out = []
missing_meta, missing_ak = [], []
for s in anime["shows"]:
    m = META.get(s["id"])
    if not m:
        missing_meta.append(s["id"]); continue
    st, kind, year, genres, syn = m
    out.append({
        "id": s["id"], "title": s["title"], "cover": s.get("cover", ""),
        "akid": akid.get(s["title"]),
        "episodes": TOTAL_FIX.get(s["id"], s["episodes"]),
        "status": st, "kind": kind, "year": year,
        "genres": genres, "synopsis": syn,
    })
    if akid.get(s["title"]) is None:
        missing_ak.append(s["title"])
print("shows:", len(out), "| tanpa meta:", missing_meta, "| tanpa akid:", missing_ak)
js = ("/* Guoke AMHDQ — KATALOG ANIME (satu-satunya file yang perlu diedit\n"
      "   untuk menambah/mengubah judul).\n"
      "   - episodes = TOTAL episode sebenarnya. Kalau file embed di data/eps/\n"
      "     belum selengkap itu, sisanya otomatis berlabel \"Segera hadir\".\n"
      "   - status: \"tayang\" | \"tamat\" • kind: \"series\" | \"film\"\n"
      "   - akid: id API anikoto (embed). Kosongkan (null) bila belum ada.\n"
      "   Dibuat otomatis oleh tools/gen_anime_js.py; refresh harian via\n"
      "   tools/refresh_all.py (sync_anime_js) mempertahankan kolom manual. */\n"
      "window.GQ_ANIME = ")
payload = {"updated": anime.get("updated", ""), "shows": out}
open("data-anime.js", "w").write(js + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n")
print("data-anime.js ditulis")
