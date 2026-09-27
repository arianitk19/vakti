import json, os, re
OUT='../data'
# ---------- prayers (standard time) ----------
raw=json.load(open('../raw/kosovo-prayer-times.json'))
meta=raw['metadata']
def m(s):
    h,mi=s.split(':'); return int(h)*60+int(mi)
days={}
dst_start=(3,29); dst_end=(10,25)   # 2026: CEST from Mar 29 up to Oct 24 inclusive
import datetime
for month,rows in raw['prayer_times'].items():
    for r in rows:
        d=datetime.date.fromisoformat(r['date'])
        vals=[m(r[k]) for k in ('imsak','fajr','sunrise','dhuhr','asr','maghrib','isha')]
        if datetime.date(2026,3,29)<=d<datetime.date(2026,10,25):
            vals=[v-60 for v in vals]
        days[d.strftime('%m-%d')]=vals
assert len(days)==365
out={
 "meta":{"source":meta['source'],"sourceUrl":meta['source_url'],"dataYear":meta['year'],"hijriYear":meta['hijri_year'],
  "referenceCity":"Deçan","calculation":meta['calculation_method'],"timezone":"Europe/Belgrade",
  "repo":"https://github.com/drilonjaha/kohet-e-namazit-kosove-json","license":"MIT (Drilon Jaha)",
  "note":"Kohët janë ruajtur në kohë standarde (CET/UTC+1); ora verore shtohet gjatë ekzekutimit sipas vitit aktual."},
 "order":["imsak","fajr","sunrise","dhuhr","asr","maghrib","isha"],
 "cityOffsets":meta['city_offsets_minutes'],
 "events2026":meta['islamic_events_2026'],
 "days":days}
json.dump(out,open(f'{OUT}/prayers.json','w'),separators=(',',':'))

# ---------- quran verse text (used only to source the Arabic/transliteration of duas/dhikr that quote a verse —
# there is no standalone Quran-reading module in the app; the user reads the Quran in a separate app) ----------
q=json.load(open('../node_modules/quran-json/dist/quran.json'))
t=json.load(open('../node_modules/quran-json/dist/quran_transliteration.json'))
def ayah(s,a,b=None):
    b=b or a
    ar=' '.join(q[s-1]['verses'][i-1]['text'] for i in range(a,b+1))
    tr=' '.join(t[s-1]['verses'][i-1]['transliteration'] for i in range(a,b+1))
    return ar,tr

# ---------- duas ----------
D=[]
def add(id,title,cats,ar,tr,sq,src,count=None):
    D.append({"id":id,"title":title,"cats":cats,"arabic":ar,"transliteration":tr,"translation":sq,"source":src,"count":count})
def addq(id,title,cats,s,a,b,sq,count=None):
    ar,tr=ayah(s,a,b)
    ref=f"{s}:{a}" if not b or b==a else f"{s}:{a}-{b}"
    add(id,title,cats,ar,tr,sq,f"Kurani {ref}",count)

add("dua-istighfar-pas-namazit","Kërkim falje pas namazit",["after_prayer"],
 "أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ. اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
 "Estagfirull-llah (3 herë). Allahumme entes-selam ue minkes-selam, tebarekte ja dhel-xhelali uel-ikram.",
 "Kërkoj falje nga Allahu (3 herë). O Allah, Ti je Paqja dhe prej Teje vjen paqja. I bekuar qofsh, o Zotëri i Madhërisë dhe i Bujarisë.",
 "Muslimi 591",None)
addq("dua-ajetul-kursi","Ajeti i Fronit (Ajetul Kursi)",["after_prayer","sleep","protection"],2,255,None,
 "Perëndia është – s'ka tjetër zot përveç Tij, (i cili) jeton përgjithmonë dhe zotëron (mbi të gjitha krijesat)! Atë nuk e kaplon as kotja as gjumi! Të Atij janë të gjitha ato që gjenden në qiej dhe në Tokë. Kush mund të angazhohet për ndokend pa lejën e Tij? Ai di çdo gjë që ka ndodhë përpara dhe çdo gjë që do të ndodhë në të ardhmen. Por, njerëzit, nuk dinë asgjë nga dijenia e Tij, përveç asaj që Ai ka dashur t'ua tregojë. Froni (Madhëria) e Tij përfshin qiejt dhe Tokën dhe Atij nuk i vie rëndë t'i ruajë ato. Ai është shumë i Lartë, i Madhëruar! (Kurani 2:255, përkth. Hasan Efendi Nahi)")
add("dua-ndihme-dhikr","Ndihmë për përmendje dhe falënderim",["after_prayer","gratitude"],
 "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
 "Allahumme e'inni ala dhikrike ue shukrike ue husni ibadetike.",
 "O Allah, më ndihmo që të të përmend, të të falënderoj dhe ta bëj mirë adhurimin ndaj Teje.",
 "Ebu Davudi 1522; en-Nesai 1303")
add("dua-mengjes-bike-asbahna","Lutja e mëngjesit",["morning"],
 "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
 "Allahumme bike asbahna ue bike emsejna ue bike nahja ue bike nemutu ue ilejken-nushur.",
 "O Allah, me Ty e arritëm mëngjesin dhe me Ty e arritëm mbrëmjen; me Ty jetojmë dhe me Ty vdesim, dhe tek Ti është ringjallja.",
 "Tirmidhiu 3391")
add("dua-mbremje-bike-emsejna","Lutja e mbrëmjes",["evening"],
 "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ",
 "Allahumme bike emsejna ue bike asbahna ue bike nahja ue bike nemutu ue ilejkel-masir.",
 "O Allah, me Ty e arritëm mbrëmjen dhe me Ty e arritëm mëngjesin; me Ty jetojmë dhe me Ty vdesim, dhe tek Ti është kthimi.",
 "Tirmidhiu 3391")
add("dua-sejjidul-istigfar","Sejjidul istigfar (zotëruesi i kërkimit të faljes)",["morning","evening","repentance"],
 "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
 "Allahumme ente Rabbi la ilahe il-la ent, halakteni ue ena abduke, ue ena ala ahdike ue ue'dike mestet'a't, e'udhu bike min sherri ma sana'tu, ebu'u leke bi ni'metike alejje, ue ebu'u leke bi dhenbi, fagfir li fe innehu la jagfirudh-dhunube il-la ent.",
 "O Allah, Ti je Zoti im, nuk ka të adhuruar tjetër përveç Teje. Më krijove dhe unë jam robi Yt; sa të mundem qëndroj besnik ndaj besëlidhjes dhe premtimit Tënd. Kërkoj mbrojtje te Ti nga e keqja që bëra. Pranoj te Ti begatinë Tënde ndaj meje dhe pranoj mëkatin tim; më fal, sepse askush nuk i fal mëkatet pos Teje.",
 "Buhariu 6306")
add("dua-bismillahil-ledhi","Mbrojtja nga dëmi",["morning","evening","protection"],
 "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
 "Bismil-lahil-ledhi la jedurru me'asmihi shej'un fil-erdi ue la fis-sema'i ue huues-semi'ul-alim.",
 "Në emër të Allahut, me emrin e të Cilit asgjë nuk dëmton as në tokë, as në qiell; Ai është Dëgjuesi, Dijetari.",
 "Ebu Davudi 5088; Tirmidhiu 3388",3)
add("dua-zgjimi","Kur zgjohesh",["morning"],
 "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
 "El-hamdu lil-lahil-ledhi ahjana ba'de ma ematena ue ilejhin-nushur.",
 "Falënderimi i qoftë Allahut që na ngjalli pasi na kishte bërë të vdekur, dhe tek Ai është ringjallja.",
 "Buhariu 6312")
add("dua-para-gjumit","Para gjumit",["sleep"],
 "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
 "Bismike Allahumme emutu ue ahja.",
 "Në emrin Tënd, o Allah, vdes dhe jetoj.",
 "Buhariu 6324")
add("dua-para-ushqimit","Para ushqimit",["before_food"],
 "بِسْمِ اللَّهِ",
 "Bismil-lah.",
 "Në emër të Allahut. (Nëse harrohet në fillim: «Bismil-lahi ev-velehu ue ahirehu».)",
 "Ebu Davudi 3767; Tirmidhiu 1858")
add("dua-pas-ushqimit","Pas ushqimit",["after_food","gratitude"],
 "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ",
 "El-hamdu lil-lahil-ledhi at'amena ue sekana ue xha'alena muslimin.",
 "Falënderimi i qoftë Allahut që na ushqeu, na dha të pimë dhe na bëri myslimanë.",
 "Ebu Davudi 3850")
addq("dua-udhetim","Lutja e udhëtimit",["travel"],43,13,14,
 "«I pastër është Ai që na e nënshtroi këtë; ne vetë nuk do të ishim në gjendje ta bënim. Dhe ne vërtet te Zoti ynë do të kthehemi.» (kuptimi i përafërt)")
D[-1]["source"]="Kurani 43:13-14; Muslimi 1342"
add("dua-falenderim-nimet","Falënderim për begatinë",["gratitude","morning"],
 "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
 "Allahumme ma asbaha bi min ni'metin ev bi ehadin min halkike fe minke uahdeke la sherike lek, fe lekel-hamdu ue lekesh-shukr.",
 "O Allah, çdo begati që ka arritur tek unë ose tek ndonjë krijesë e Jotja këtë mëngjes, është vetëm prej Teje, pa ortak. Ty të takon lavdërimi dhe Ty falënderimi.",
 "Ebu Davudi 5073")
add("dua-tevbe","Kërkim faljeje dhe pendim",["repentance"],
 "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
 "Rabbigfir li ue tub alejje inneke entet-teuuabur-rahim.",
 "Zoti im, më fal dhe ma prano pendimin, sepse Ti je Pranuesi i pendimit, i Mëshirshmi.",
 "Ebu Davudi 1516; Tirmidhiu 3434")
addq("dua-ademi","Lutja e Ademit dhe Havasë",["repentance"],7,23,None,
 "«Zoti ynë, ne i bëmë padrejtësi vetes; nëse Ti nuk na fal dhe nuk na mëshiron, do të jemi sigurisht nga humbësit.» (kuptimi i përafërt)")
addq("dua-junusit","Lutja e Junusit",["hardship","repentance"],21,87,None,
 "«Nuk ka zot tjetër përveç Teje! I pastër je Ti! Unë kam qenë nga ata që i bëjnë padrejtësi vetes.» (pjesa e lutjes; kuptimi i përafërt)")
addq("dua-hasbunallah","Na mjafton Allahu",["hardship","protection"],3,173,None,
 "Na mjafton Allahu, dhe Ai është Kujdestari më i mirë.")
addq("dua-musait","Lutja e Musait për lehtësim",["hardship"],20,25,28,
 "«Zoti im, ma zgjero gjoksin, ma lehtëso punën, ma zgjidh nyjën e gjuhës, që ta kuptojnë fjalën time.» (kuptimi i përafërt)")
addq("dua-prinderit-17-24","Për prindërit",["parents"],17,24,None,
 "«Zoti im, mëshiroji ata siç më rritën mua kur isha i vogël.» (pjesa e lutjes; kuptimi i përafërt)")
addq("dua-prinderit-14-41","Për prindërit dhe besimtarët",["parents"],14,41,None,
 "«Zoti ynë, më fal mua, prindërit e mi dhe besimtarët ditën kur do të bëhet llogaria.» (kuptimi i përafërt)")
addq("dua-familja-25-74","Për familjen",["family"],25,74,None,
 "«Zoti ynë, na dhuro në bashkëshortet dhe pasardhësit tanë gëzim për sytë dhe bëna prijës të të devotshmëve.» (kuptimi i përafërt)")
addq("dua-familja-14-40","Për vazhdimin e namazit",["family","general"],14,40,None,
 "«Zoti im, më bëj që ta kryej namazin, edhe pasardhësit e mi. Zoti ynë, pranoje lutjen time.» (kuptimi i përafërt)")
addq("dua-dunja-ahiret","Mirësi në këtë botë dhe në tjetrën",["general"],2,201,None,
 "«Zoti ynë, na jep mirësi në këtë botë dhe mirësi në botën tjetër, dhe na ruaj nga dënimi i zjarrit.» (kuptimi i përafërt)")
addq("dua-zemra","Që zemra të mos devijojë",["general"],3,8,None,
 "«Zoti ynë, mos i lër zemrat tona të shmangen pasi na udhëzove, dhe na dhuro mëshirë prej Teje; vërtet Ti je Dhuruesi.» (kuptimi i përafërt)")
addq("dua-diturise","Shtim i dijes",["general"],20,114,None,
 "Fjalia e lutjes: «Zoti im, ma shto dijen.» (kuptimi i përafërt)")
addq("dua-vellezerit","Për vëllezërit besimtarë",["general"],59,10,None,
 "«Zoti ynë, na fal neve dhe vëllezërit tanë që na paraprinë në besim, dhe mos lër në zemrat tona urrejtje ndaj besimtarëve.» (pjesa e lutjes; kuptimi i përafërt)")
SQ_SURE = {
    112: 'Thuaj: "Perëndia është Një! Perëndisë i drejtohen për çdo gjë! (Ai) nuk ka lindur prej ndokujt, as nuk ka lindur kë, dhe askush nuk i gjason Atij!"',
    113: 'Thuaj: "I lutem dhe mbështetem te Zoti i agimit, që të më mbrojë nga sherri i të gjitha krijesave, dhe prej sherrit të natës kur kaplon terri, dhe prej sherrit të falltorëve që fryejnë në nyje, dhe nga sherri i ziliqarit kur e shfaq zilinë!"',
    114: 'Thuaj: "I lutem dhe i mbështetem Zotit të njerëzve, Sundimtarit të njerëzve, Perëndisë së njerëzve, nga sherri i djallit, bezdisës, i cili fshehurazi hedh dyshime në shpirtërat e njerëzve – prej xhindëve dhe prej njerëzve!"',
}
for sid,ttl in ((112,"Sureja El-Ikhlas"),(113,"Sureja El-Felek"),(114,"Sureja En-Nas")):
    ar,tr=ayah(sid,1,len(q[sid-1]['verses']))
    add(f"dua-sure-{sid}",ttl+" (mbrojtje)",["morning","evening","sleep","protection"],ar,tr,
        SQ_SURE[sid]+" (përkth. Hasan Efendi Nahi)",f"Kurani {sid}; Ebu Davudi 5082; Tirmidhiu 3575",3)
json.dump({"categories":["after_prayer","morning","evening","sleep","before_food","after_food","travel","protection","gratitude","repentance","hardship","parents","family","general"],"items":D},open(f'{OUT}/duas.json','w'),ensure_ascii=False,indent=0)

# ---------- dhikr ----------
K=[]
def dk(id,title,cats,ar,tr,sq,src,count):
    K.append({"id":id,"title":title,"cats":cats,"arabic":ar,"transliteration":tr,"translation":sq,"source":src,"count":count})
dk("dhikr-subhanallah","Subhanallah",["after_prayer","sleep"],"سُبْحَانَ اللَّهِ","Subhanall-lah","I pastër është Allahu.","Muslimi 597; Buhariu 3113",33)
dk("dhikr-elhamdulillah","Elhamdulilah",["after_prayer","sleep"],"الْحَمْدُ لِلَّهِ","El-hamdu lil-lah","Falënderimi i qoftë Allahut.","Muslimi 597; Buhariu 3113",33)
dk("dhikr-allahu-ekber","Allahu ekber",["after_prayer","sleep"],"اللَّهُ أَكْبَرُ","Allahu ekber","Allahu është më i Madhi.","Muslimi 597 (33 pas namazit); Buhariu 3113 (34 para gjumit)",33)
dk("dhikr-tehlil-100","Fjala e njësimit",["after_prayer"],"لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ","La ilahe il-lallahu uahdehu la sherike leh, lehul-mulku ue lehul-hamdu ue huue ala kul-li shej'in kadir.","Nuk ka të adhuruar tjetër përveç Allahut, i Vetmi, pa ortak. Atij i takon sundimi dhe lavdërimi, dhe Ai ka fuqi mbi çdo gjë.","Muslimi 597",1)
dk("dhikr-subhanallahi-ue-bihamdihi","Subhanallahi ue bihamdihi",["morning","evening","general"],"سُبْحَانَ اللَّهِ وَبِحَمْدِهِ","Subhanall-lahi ue bihamdih.","I pastër është Allahu dhe Atij i takon lavdërimi.","Muslimi 2692",100)
dk("dhikr-istigfar-100","Istigfar",["general","morning"],"أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ","Estagfirull-lahe ue etubu ilejh.","Kërkoj falje nga Allahu dhe pendohem para Tij.","Muslimi 2702",100)
dk("dhikr-hauqale","La haule ue la kuvvete il-la bil-lah",["general"],"لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ","La haule ue la kuvvete il-la bil-lah.","Nuk ka forcë e as fuqi pos me Allahun.","Buhariu 6384; Muslimi 2704",None)
dk("dhikr-salavat","Salavatet mbi Profetin ﷺ",["general"],"اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ","Allahumme sal-li ala Muhammedin ue ala ali Muhammed, kema sal-lejte ala Ibrahime ue ala ali Ibrahim, inneke hamidun mexhid. Allahumme barik ala Muhammedin ue ala ali Muhammed, kema barakte ala Ibrahime ue ala ali Ibrahim, inneke hamidun mexhid.","O Allah, dërgo mëshirë mbi Muhamedin dhe familjen e Muhamedit, ashtu siç dërgove mbi Ibrahimin dhe familjen e Ibrahimit; Ti je i Lavdëruar, i Lartë. O Allah, bekoji Muhamedin dhe familjen e Muhamedit, ashtu siç i bekove Ibrahimin dhe familjen e Ibrahimit; Ti je i Lavdëruar, i Lartë.","Buhariu 3370",None)
for sid,ttl in ((112,"El-Ikhlas"),(113,"El-Felek"),(114,"En-Nas")):
    ar,tr=ayah(sid,1,len(q[sid-1]['verses']))
    dk(f"dhikr-sure-{sid}",f"Sureja {ttl}",["morning","evening","sleep"],ar,tr,SQ_SURE[sid]+" (përkth. Hasan Efendi Nahi)",f"Kurani {sid}; Ebu Davudi 5082; Tirmidhiu 3575",3)
ar,tr=ayah(2,255)
dk("dhikr-ajetul-kursi","Ajetul Kursi",["after_prayer","sleep"],ar,tr,
   "Perëndia është – s'ka tjetër zot përveç Tij, (i cili) jeton përgjithmonë dhe zotëron (mbi të gjitha krijesat)! Atë nuk e kaplon as kotja as gjumi! Të Atij janë të gjitha ato që gjenden në qiej dhe në Tokë. Kush mund të angazhohet për ndokend pa lejën e Tij? Ai di çdo gjë që ka ndodhë përpara dhe çdo gjë që do të ndodhë në të ardhmen. Por, njerëzit, nuk dinë asgjë nga dijenia e Tij, përveç asaj që Ai ka dashur t'ua tregojë. Froni (Madhëria) e Tij përfshin qiejt dhe Tokën dhe Atij nuk i vie rëndë t'i ruajë ato. Ai është shumë i Lartë, i Madhëruar! (Kurani 2:255, përkth. Hasan Efendi Nahi)",
   "Kurani 2:255; Buhariu 2311 (para gjumit)",1)
json.dump({"categories":["after_prayer","morning","evening","sleep","general"],"items":K},open(f'{OUT}/dhikr.json','w'),ensure_ascii=False,indent=0)
json.dump([],open(f'{OUT}/lectures.json','w')); json.dump([],open(f'{OUT}/scholars.json','w'))
print(len(D),len(K))
