import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp, doc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc
} from "firebase/firestore";

// ─── FIREBASE CONFIG ── Replace with your own Firebase project config ───────
// Get this from Firebase Console → Project Settings → Your apps → Web app

// ────────────────────────────────────────────────────────────────────────────

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPPG_y_Khs9hGxBLZwjq8YZrmtZ4GIvWc",
  authDomain: "healthcare-136b1.firebaseapp.com",
  projectId: "healthcare-136b1",
  storageBucket: "healthcare-136b1.firebasestorage.app",
  messagingSenderId: "476976550412",
  appId: "1:476976550412:web:d62eae37ae83dbd5b49429",
  measurementId: "G-51SY829T8G"
};

let _app, _db;
function getDB() {
  if (!_db) {
    _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    _db = getFirestore(_app);
  }
  return _db;
}

const CHART_DATA = [
  { day: "Mon", patients: 12 },
  { day: "Tue", patients: 18 },
  { day: "Wed", patients: 10 },
  { day: "Thu", patients: 22 },
  { day: "Fri", patients: 17 },
  { day: "Sat", patients: 25 },
  { day: "Sun", patients: 15 },
];

// Seed initial data into Firestore on first run (idempotent – checks flag doc)
async function seedInitialData() {
  const db = getDB();
  const flagRef = doc(db, "meta", "seeded");
  const flagSnap = await getDoc(flagRef);
  if (flagSnap.exists()) return; // already seeded

  const seedBookings = [
    { id: "#B1042", client: "Martha Johnson",  service: "Elder Care",      caregiver: "Emma T.",   date: "Apr 22", status: "confirmed" },
    { id: "#B1041", client: "George Williams", service: "Medical Assist.", caregiver: "James K.",  date: "Apr 22", status: "confirmed" },
    { id: "#B1040", client: "Helen Carter",    service: "Overnight Care",  caregiver: "Linda R.",  date: "Apr 21", status: "pending" },
    { id: "#B1039", client: "Frank Davis",     service: "Transportation",  caregiver: "Carlos M.", date: "Apr 20", status: "cancelled" },
    { id: "#B1038", client: "Patricia Lee",    service: "Meal Prep",       caregiver: "Emma T.",   date: "Apr 19", status: "confirmed" },
  ];
  const seedClients = [
    { id:"C001", name:"Martha Johnson",  service:"Elder Care",       status:"active" },
    { id:"C002", name:"George Williams", service:"Medical Assist.",  status:"active" },
    { id:"C003", name:"Helen Carter",    service:"Overnight Care",   status:"active" },
    { id:"C004", name:"Frank Davis",     service:"Transportation",   status:"inactive" },
    { id:"C005", name:"Patricia Lee",    service:"Meal Prep",        status:"active" },
    { id:"C006", name:"Thomas Brown",    service:"Companionship",    status:"active" },
    { id:"C007", name:"Alice Morgan",    service:"Physical Therapy", status:"active" },
  ];
  const seedCaregivers = [
    { id:"CG01", name:"Emma Thompson",  role:"Elder Care Specialist",  status:"on",  phone:"", email:"", exp:"12 yrs", cert:"CNA", speciality:"Elder Care,Meal Prep", notes:"" },
    { id:"CG02", name:"James Kowalski", role:"Registered Nurse",       status:"on",  phone:"", email:"", exp:"14 yrs", cert:"RN, BSN", speciality:"Medical Assistance,IV Therapy", notes:"" },
    { id:"CG03", name:"Linda Rivera",   role:"Night Caregiver",        status:"sc",  phone:"", email:"", exp:"10 yrs", cert:"CNA", speciality:"Personal Hygiene,Overnight Care", notes:"" },
    { id:"CG04", name:"Carlos Mendes",  role:"Transport Aide & EMT",   status:"on",  phone:"", email:"", exp:"8 yrs",  cert:"EMT-Basic", speciality:"Transportation,Emergency Response", notes:"" },
    { id:"CG05", name:"Sophie Park",    role:"Physiotherapist",        status:"brk", phone:"", email:"", exp:"9 yrs",  cert:"DPT", speciality:"Physical Therapy,Stroke Rehab", notes:"" },
    { id:"CG06", name:"David Chen",     role:"Companion Care Aide",    status:"sc",  phone:"", email:"", exp:"6 yrs",  cert:"HHA", speciality:"Companionship,Meal Preparation", notes:"" },
  ];

  for (const b of seedBookings) {
    await addDoc(collection(db, "bookings"), { ...b, createdAt: serverTimestamp(), isNew: false });
  }
  for (const c of seedClients) {
    await addDoc(collection(db, "clients"), { ...c, createdAt: serverTimestamp(), isNew: false });
  }
  for (const cg of seedCaregivers) {
    await addDoc(collection(db, "caregivers"), { ...cg, createdAt: serverTimestamp() });
  }
  await setDoc(flagRef, { at: serverTimestamp() });
}

const VIDEOS = [
  {
    src: "https://videos.pexels.com/video-files/3196716/3196716-uhd_2560_1440_25fps.mp4",
    badge: "Trusted Since 2010",
    title: "Compassionate Care,\nRight at <em>Home</em>",
    desc: "Personalized in-home care that brings dignity, comfort, and professional support to your loved ones.",
  },
  {
    src: "https://videos.pexels.com/video-files/6129122/6129122-uhd_2560_1440_25fps.mp4",
    badge: "500+ Happy Families",
    title: "Caring for Every\n<em>Season</em> of Life",
    desc: "From elder care to post-surgery recovery, our certified caregivers are available 24/7 for your family.",
  },
  {
    src: "https://videos.pexels.com/video-files/7551465/7551465-uhd_2560_1440_25fps.mp4",
    badge: "Award-Winning Services",
    title: "Your Family Deserves\nthe <em>Best</em>",
    desc: "Background-checked, trained professionals providing medical assistance, companionship, and daily support.",
  },
];

const SERVICES = [
  { icon: "🧓", name: "Elder Care", desc: "Specialized support for seniors including daily routines, mobility assistance, and health monitoring." },
  { icon: "💊", name: "Medical Assistance", desc: "Medication management, vital sign monitoring, and coordination with healthcare professionals." },
  { icon: "🛁", name: "Personal Hygiene", desc: "Bathing, grooming, and dressing assistance delivered with dignity and respect." },
  { icon: "🍽️", name: "Meal Preparation", desc: "Nutritious meal planning and preparation tailored to dietary requirements and personal preferences." },
  { icon: "🏃", name: "Physical Therapy", desc: "Certified therapists providing in-home rehabilitation and mobility improvement programs." },
  { icon: "💬", name: "Companionship", desc: "Friendly, compassionate companionship to reduce loneliness and provide meaningful social interaction." },
  { icon: "🚗", name: "Transportation", desc: "Safe, reliable transport to medical appointments, errands, and community activities." },
  { icon: "🏠", name: "Housekeeping", desc: "Light cleaning, laundry, and organization to maintain a safe, comfortable home environment." },
  { icon: "🌙", name: "Overnight Care", desc: "Around-the-clock overnight supervision and assistance for those requiring continuous support." },
];

const SPECIALIST_REVIEWS = {
  "Dr. Margaret Collins": [
    { name:"Susan T.", initials:"ST", rating:5, date:"Mar 2025", text:"Dr. Collins has been an absolute blessing for my mother. Her knowledge of dementia care is extraordinary and she always arrives with such warmth and professionalism." },
    { name:"Harold B.", initials:"HB", rating:5, date:"Feb 2025", text:"After trying several caregivers, Dr. Collins is truly one of a kind. She noticed things about my father's health that even his GP missed. Highly recommend." },
    { name:"Cynthia L.", initials:"CL", rating:4, date:"Jan 2025", text:"Very thorough and compassionate. My dad actually looks forward to her visits which says everything. Scheduling could be slightly more flexible but otherwise perfect." },
    { name:"James P.", initials:"JP", rating:5, date:"Dec 2024", text:"Outstanding caregiver. Treated my mother with incredible dignity and the improvement in her mood and mobility has been remarkable. We are truly grateful." },
  ],
  "Robert Flanagan": [
    { name:"Diane M.", initials:"DM", rating:5, date:"Mar 2025", text:"Robert is incredibly patient and kind. My father can be difficult but Robert handles every situation with grace. He's become part of our family." },
    { name:"Aaron K.", initials:"AK", rating:5, date:"Feb 2025", text:"Punctual, professional, and genuinely caring. Robert goes well beyond what's required — he even reads to my gran and plays chess with her. Wonderful man." },
    { name:"Fiona S.", initials:"FS", rating:4, date:"Jan 2025", text:"Very happy with Robert's service. He's reliable and thorough. Communication with the family could be slightly more frequent but the care itself is excellent." },
  ],
  "Sofia Nguyen": [
    { name:"Martin H.", initials:"MH", rating:5, date:"Apr 2025", text:"Sofia completely transformed how our family coordinates mum's care. She created a plan that actually works and keeps everyone informed. Outstanding manager." },
    { name:"Kelly W.", initials:"KW", rating:5, date:"Mar 2025", text:"From the first meeting Sofia made us feel heard and understood. Her wellness plan for dad was comprehensive, compassionate, and incredibly effective." },
    { name:"Tina G.", initials:"TG", rating:4, date:"Jan 2025", text:"Sofia is professional and very thorough. The family liaison aspect of her role is great — we always know what is happening with our loved one's care." },
  ],
  "James Kowalski": [
    { name:"Rachel D.", initials:"RD", rating:5, date:"Apr 2025", text:"James is exceptional. After my husband's surgery his wound care and monitoring were flawless. He has the bedside manner of the best hospital nurses, but at home." },
    { name:"Peter O.", initials:"PO", rating:5, date:"Mar 2025", text:"Incredibly skilled nurse. He caught a medication interaction that could have been serious. Calm under pressure and always explains everything clearly. Top professional." },
    { name:"Sandra R.", initials:"SR", rating:5, date:"Feb 2025", text:"James cared for my elderly mother after her hip surgery. He was thorough, gentle, and kept me fully informed every step of the way. Could not ask for better." },
    { name:"Mike T.", initials:"MT", rating:4, date:"Jan 2025", text:"Very competent RN. Took a bit of time for mum to warm up to him but once she did she felt very safe. His medical knowledge is clearly excellent." },
  ],
  "Dr. Anita Patel": [
    { name:"Sunita R.", initials:"SR", rating:5, date:"Apr 2025", text:"Dr. Patel is phenomenal. She reviewed my father's entire medication history and simplified it considerably. His energy and alertness improved within weeks." },
    { name:"George F.", initials:"GF", rating:5, date:"Mar 2025", text:"Having a real doctor come to the home was a game changer for us. Dr. Patel is thorough, patient, and takes time to explain everything. A true gem." },
    { name:"Priya N.", initials:"PN", rating:5, date:"Feb 2025", text:"Dr. Patel's in-home visits have replaced countless stressful hospital trips for my mum. The quality of care and attention she provides is simply unmatched." },
  ],
  "Carlos Mendes": [
    { name:"Nina B.", initials:"NB", rating:5, date:"Mar 2025", text:"Carlos is so reliable and genuinely cares about his patients. He made transport to my dad's chemo sessions stress-free and even waited every single time." },
    { name:"Leo A.", initials:"LA", rating:4, date:"Feb 2025", text:"Professional and punctual. His EMT background gives me real confidence when Carlos looks after my father. Always calm and prepared for any situation." },
    { name:"Elsa K.", initials:"EK", rating:5, date:"Jan 2025", text:"Wonderful caregiver. His wheelchair-accessible vehicle and patient assistance made my mother's medical trips comfortable for the first time in years." },
  ],
  "Linda Rivera": [
    { name:"Joan M.", initials:"JM", rating:5, date:"Apr 2025", text:"Linda is gentle, respectful, and incredibly thorough. My mother was initially very resistant to personal care help but Linda won her over completely in the first week." },
    { name:"Steven A.", initials:"SA", rating:5, date:"Mar 2025", text:"Exceptional caregiver. My dad has never looked better or felt more comfortable. Linda approaches every task with quiet dignity and true professionalism." },
    { name:"Carmen T.", initials:"CT", rating:5, date:"Feb 2025", text:"Linda is a rare find. She is patient, warm, and treats my gran with the same respect and care she would give her own family. We adore her." },
    { name:"Andrew B.", initials:"AB", rating:4, date:"Dec 2024", text:"Very happy with Linda's care. My mother's skin condition has improved noticeably since Linda started. Slightly wish she was available more days but quality is superb." },
  ],
  "Grace Okafor": [
    { name:"Ruth P.", initials:"RP", rating:5, date:"Mar 2025", text:"Grace is so cheerful and thorough. My mum's hygiene routine has never been more consistent. She genuinely makes it a pleasant experience rather than a chore." },
    { name:"Felix O.", initials:"FO", rating:4, date:"Feb 2025", text:"Good caregiver, very kind and competent. Takes time to explain what she is doing and why, which helps my father feel in control. Would definitely recommend." },
  ],
  "Emma Thompson": [
    { name:"Barbara S.", initials:"BS", rating:5, date:"Apr 2025", text:"Emma's meals are extraordinary. My husband's blood sugar has been under control since she started managing his diet. Her food is also genuinely delicious." },
    { name:"George R.", initials:"GR", rating:5, date:"Mar 2025", text:"We hired Emma for my diabetic mother and the improvement in her health has been incredible. She is also a lovely person who treats mum with such warmth." },
    { name:"Lisa C.", initials:"LC", rating:5, date:"Feb 2025", text:"Emma's allergen-free cooking has given our whole family peace of mind. She is creative, knowledgeable about nutrition, and always on time. Truly wonderful." },
  ],
  "David Chen": [
    { name:"Michael L.", initials:"ML", rating:5, date:"Mar 2025", text:"David introduced my father to low-sodium versions of his favourite dishes that actually taste great. His cultural sensitivity in meal choices has made a real difference." },
    { name:"Amy W.", initials:"AW", rating:4, date:"Feb 2025", text:"Good service, food quality is excellent and David is thoughtful about dietary needs. He has a lovely manner with my nan and always checks she enjoys her meals." },
  ],
  "Sophie Park": [
    { name:"Claire H.", initials:"CH", rating:5, date:"Apr 2025", text:"Sophie is absolutely outstanding. After my father's stroke, no one held out much hope for his recovery. Sophie's programme has him walking with a frame — a miracle." },
    { name:"Tom K.", initials:"TK", rating:5, date:"Apr 2025", text:"After my knee replacement Sophie had me moving again in weeks. Her exercises were perfectly calibrated and her encouragement made all the difference. Best physio I've ever had." },
    { name:"Diana S.", initials:"DS", rating:5, date:"Mar 2025", text:"Sophie's expertise in neurological rehab is truly exceptional. My mother regained hand function we thought was permanently lost. We are overwhelmingly grateful." },
    { name:"Paul N.", initials:"PN", rating:5, date:"Feb 2025", text:"Sophie combines deep clinical knowledge with genuine warmth. Her home visits meant my elderly aunt could recover without the stress of travel. Exceptional professional." },
    { name:"Joanna F.", initials:"JF", rating:4, date:"Jan 2025", text:"Very skilled physiotherapist. My husband has made great progress under her care. She adapts exercises based on how he feels each day which is so important." },
  ],
  "Marcus Williams": [
    { name:"Nathan P.", initials:"NP", rating:5, date:"Apr 2025", text:"Marcus designed a balance training programme that completely transformed my father's confidence. He went from near-falls weekly to being independent again. Brilliant." },
    { name:"Laura B.", initials:"LB", rating:5, date:"Mar 2025", text:"After my sports injury Marcus got me back to full mobility faster than I thought possible. His manual therapy skills are exceptional. Highly recommend." },
    { name:"Victor M.", initials:"VM", rating:5, date:"Feb 2025", text:"Marcus is professional, knowledgeable, and incredibly encouraging. My recovery has been so much faster than expected. His home visits are a real luxury." },
    { name:"Helen T.", initials:"HT", rating:4, date:"Jan 2025", text:"Very good physiotherapist. Communicates clearly and adapts the plan as needed. My husband's strength has improved markedly since starting with Marcus." },
  ],
  "Dr. Yasmin Hassan": [
    { name:"Omar K.", initials:"OK", rating:5, date:"Apr 2025", text:"Dr. Hassan helped my wife regain independence we thought was gone forever. Her home adaptation recommendations were practical, affordable, and made a huge difference." },
    { name:"Sarah T.", initials:"ST", rating:5, date:"Mar 2025", text:"Brilliant occupational therapist. She assessed our home and within a week my father could manage his daily routine almost entirely independently. Extraordinary." },
    { name:"Fatima A.", initials:"FA", rating:5, date:"Feb 2025", text:"Dr. Hassan's cognitive rehabilitation work with my mother has been remarkable. She is patient, evidence-based, and genuinely invested in her patients' progress." },
  ],
  "Thomas Briggs": [
    { name:"Grace K.", initials:"GK", rating:5, date:"Apr 2025", text:"Thomas has become genuinely important to my father's happiness. He arrives with energy, conversation and activities every single time. Dad lights up when he visits." },
    { name:"Ben L.", initials:"BL", rating:5, date:"Mar 2025", text:"My gran was deeply lonely before Thomas came into her life. Now she has something to look forward to each week. He is kind, engaging, and absolutely trustworthy." },
    { name:"Rita S.", initials:"RS", rating:4, date:"Jan 2025", text:"Thomas is a genuinely warm person who connects well with elderly clients. He finds common interests quickly and makes each visit feel special and meaningful." },
  ],
  "Amara Diallo": [
    { name:"Isabelle W.", initials:"IW", rating:5, date:"Apr 2025", text:"Amara brings such creativity to her sessions. The arts and crafts activities she introduced have given my mother a real sense of purpose and joy. Wonderful carer." },
    { name:"David M.", initials:"DM", rating:5, date:"Mar 2025", text:"The memory games and activities Amara does with my nan have noticeably slowed her cognitive decline. She is warm, patient, and genuinely brilliant at her work." },
  ],
  "Patricia Cole": [
    { name:"Rosa G.", initials:"RG", rating:5, date:"Mar 2025", text:"Patricia is so patient and careful with my mother. She assists with boarding, carries all the shopping, and waits as long as needed. Completely reliable and kind." },
    { name:"Howard B.", initials:"HB", rating:4, date:"Feb 2025", text:"Good service, always on time. Patricia is gentle with my father who uses a wheelchair and he feels comfortable and safe with her. Would recommend." },
  ],
  "Maria Santos": [
    { name:"Elaine J.", initials:"EJ", rating:5, date:"Apr 2025", text:"Maria transformed our mum's home. It is clean, organised, and safe. She works quietly and efficiently and goes well beyond what is asked. Absolutely excellent." },
    { name:"Frank W.", initials:"FW", rating:5, date:"Mar 2025", text:"Incredibly thorough and trustworthy. Maria takes real pride in her work and the results show it. Our family has total peace of mind knowing she is there." },
    { name:"Susan O.", initials:"SO", rating:4, date:"Feb 2025", text:"Very good housekeeper. My father's home has never been cleaner or more organised. Maria is discreet and professional. We are happy with her service." },
  ],
  "Kevin O'Brien": [
    { name:"Monica T.", initials:"MT", rating:4, date:"Mar 2025", text:"Kevin does a solid job keeping mum's home safe and tidy. He also helps with errands which is invaluable. Reliable and friendly." },
    { name:"Chris S.", initials:"CS", rating:5, date:"Feb 2025", text:"Kevin identified a few safety hazards in my gran's home and sorted them immediately. That kind of initiative is exactly what you want in a care aide. Great person." },
  ],
};

const SPECIALISTS = {
  "Elder Care": [
    { name: "Dr. Margaret Collins", role: "Senior Care Specialist", exp: "18 yrs", rating: 4.9, reviews: 214, photo: "https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Dementia Care","Fall Prevention","Mobility Aid"], bio: "Dr. Collins has dedicated her career to improving quality of life for seniors. She specialises in dementia management and age-related mobility challenges.", fullBio: "Dr. Margaret Collins is one of the region's most respected senior care specialists with over 18 years of experience. She began her career in a leading geriatric ward before transitioning to in-home care, believing strongly that familiar surroundings accelerate healing and improve wellbeing for elderly patients.\n\nHer approach combines clinical rigour with genuine compassion. She holds advanced certifications in dementia care and fall prevention, and is known for her meticulous health monitoring protocols that have helped catch early warning signs for dozens of clients.\n\nDr. Collins is also passionate about family education — she regularly holds informal sessions with families to explain care strategies and empower them to support their loved ones between visits.", avail: "Mon – Sat", lang: ["English","Spanish"], cert: "Certified Gerontological Nurse", education: "BSN, University of Texas · Gerontological Nursing Certification", video: "https://videos.pexels.com/video-files/5752729/5752729-uhd_2560_1440_25fps.mp4", stats: [["214","Reviews"],["18 yrs","Experience"],["4.9★","Rating"],["500+","Clients Helped"]] },
    { name: "Robert Flanagan", role: "Elder Care Aide", exp: "11 yrs", rating: 4.8, reviews: 178, photo: "https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Daily Routines","Companionship","Health Monitoring"], bio: "Robert is known for his warm approach and ability to build genuine trust with elderly clients, making daily routines comfortable and enjoyable.", fullBio: "Robert Flanagan is a dedicated elder care aide who has spent 11 years delivering compassionate, consistent support to elderly clients. He believes that the foundation of great care is trust, and he takes the time to truly understand each client's personality, history, and preferences.\n\nHis background in community health gave him a strong foundation in monitoring vital signs, recognising early signs of health changes, and liaising effectively with medical professionals. He is particularly skilled at supporting clients who are resistant to help — his warm, unhurried manner consistently wins clients over.\n\nOutside of his core duties, Robert brings genuine companionship to every visit. He has been known to read aloud, play card games, and accompany clients on gentle outdoor walks whenever conditions allow.", avail: "All Week", lang: ["English"], cert: "Home Health Aide (HHA)", education: "Certificate in Community Health · HHA Certification", video: "https://videos.pexels.com/video-files/6129122/6129122-uhd_2560_1440_25fps.mp4", stats: [["178","Reviews"],["11 yrs","Experience"],["4.8★","Rating"],["300+","Clients Helped"]] },
    { name: "Sofia Nguyen", role: "Geriatric Care Manager", exp: "9 yrs", rating: 4.7, reviews: 142, photo: "https://images.pexels.com/photos/5407206/pexels-photo-5407206.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Care Coordination","Family Liaison","Wellness Plans"], bio: "Sofia bridges the gap between families and care teams, creating holistic wellness plans and ensuring seamless communication throughout care.", fullBio: "Sofia Nguyen is a certified geriatric care manager whose career has been defined by her talent for bringing clarity and calm to complex care situations. With 9 years of experience working across hospital discharge teams and private home care, she has an exceptional ability to assess needs and mobilise the right resources quickly.\n\nShe is known for her meticulous wellness plans, which consider not just physical health but emotional, social, and environmental factors. Her family liaison work is especially valued — families describe feeling genuinely informed and involved in their loved one's care for the first time.\n\nSofia speaks English and Vietnamese, enabling her to support a wider community of clients and families navigating the care system.", avail: "Mon – Fri", lang: ["English","Vietnamese"], cert: "Certified Care Manager (CCM)", education: "BSc Health Sciences · Certified Care Manager (CCM)", video: "https://videos.pexels.com/video-files/7551465/7551465-uhd_2560_1440_25fps.mp4", stats: [["142","Reviews"],["9 yrs","Experience"],["4.7★","Rating"],["220+","Clients Helped"]] },
  ],
  "Medical Assistance": [
    { name: "James Kowalski", role: "Registered Nurse", exp: "14 yrs", rating: 4.9, reviews: 267, photo: "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["IV Therapy","Wound Care","Vital Monitoring"], bio: "James brings hospital-level medical expertise directly to your home. He is skilled in post-surgery care, chronic disease management, and emergency response.", fullBio: "James Kowalski is a highly experienced registered nurse who spent the first decade of his career in acute hospital settings, including intensive care and surgical recovery wards, before bringing that expertise into the home care environment.\n\nHe is skilled in IV therapy, complex wound care, catheter management, and the monitoring of patients with multiple chronic conditions. His calm demeanour under pressure and deep clinical knowledge make him an invaluable presence for clients with complex medical needs.\n\nJames is also a strong advocate for patient education. He takes time to explain conditions and procedures clearly to both clients and families, ensuring everyone understands and feels empowered throughout the care process.", avail: "24/7 On Call", lang: ["English","Polish"], cert: "RN, BSN, CPHQ", education: "BSN, University of Warsaw · CPHQ Certification", video: "https://videos.pexels.com/video-files/5752729/5752729-uhd_2560_1440_25fps.mp4", stats: [["267","Reviews"],["14 yrs","Experience"],["4.9★","Rating"],["600+","Clients Helped"]] },
    { name: "Dr. Anita Patel", role: "Home Physician", exp: "20 yrs", rating: 5.0, reviews: 189, photo: "https://images.pexels.com/photos/5327580/pexels-photo-5327580.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Chronic Disease","Medication Mgmt","Teleconsults"], bio: "Dr. Patel is a board-certified internist offering comprehensive in-home medical assessments, medication reviews, and chronic disease management.", fullBio: "Dr. Anita Patel is a board-certified internist with two decades of experience in both hospital medicine and private practice. She made the transition to home-based care after recognising how much better patients fared when treated in familiar, comfortable surroundings.\n\nShe specialises in comprehensive medical assessments, complex medication reviews, and the long-term management of conditions including diabetes, heart failure, COPD, and hypertension. Her thoroughness is legendary among her clients — she regularly identifies medication interactions or undertreated conditions that have gone unnoticed elsewhere.\n\nDr. Patel also offers teleconsultation follow-ups between home visits, providing families with a direct line to expert medical guidance whenever needed.", avail: "Tue – Sat", lang: ["English","Hindi","Gujarati"], cert: "MD, Board Certified Internist", education: "MBBS, University of Mumbai · MD, Johns Hopkins · Board Certified Internal Medicine", video: "https://videos.pexels.com/video-files/6129122/6129122-uhd_2560_1440_25fps.mp4", stats: [["189","Reviews"],["20 yrs","Experience"],["5.0★","Rating"],["400+","Clients Helped"]] },
    { name: "Carlos Mendes", role: "Medical Aide & EMT", exp: "8 yrs", rating: 4.8, reviews: 131, photo: "https://images.pexels.com/photos/6749778/pexels-photo-6749778.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Emergency Response","Vitals","Patient Transport"], bio: "Carlos combines his EMT training with compassionate home care, providing rapid emergency response and reliable transportation for medical appointments.", fullBio: "Carlos Mendes brings the skills of a trained EMT to the in-home care setting, giving clients and families confidence that any medical situation will be handled with speed, expertise, and calm. His background in emergency services means he is exceptionally prepared for medical events that can arise unpredictably in the home.\n\nBeyond emergency readiness, Carlos provides dependable daily care including vital sign monitoring, medication reminders, and assistance with mobility. His vehicle is fully wheelchair-accessible and equipped with basic medical supplies for safe transport to hospital appointments.\n\nCarlos is bilingual in English and Portuguese and brings a warmth and positive energy to every interaction that clients consistently mention in their reviews.", avail: "All Week", lang: ["English","Portuguese"], cert: "EMT-Basic, HHA", education: "EMT Certification · Home Health Aide Certification", video: "https://videos.pexels.com/video-files/7551465/7551465-uhd_2560_1440_25fps.mp4", stats: [["131","Reviews"],["8 yrs","Experience"],["4.8★","Rating"],["260+","Clients Helped"]] },
  ],
  "Personal Hygiene": [
    { name: "Linda Rivera", role: "Personal Care Specialist", exp: "10 yrs", rating: 4.9, reviews: 196, photo: "https://images.pexels.com/photos/7579831/pexels-photo-7579831.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Bathing Assist","Grooming","Dignity-First Care"], bio: "Linda is renowned for her gentle, dignity-first approach to personal care. Clients consistently praise her patience, discretion, and warm personality.", fullBio: "Linda Rivera has built a reputation over 10 years as one of the most trusted personal care specialists in the region. Her approach is grounded in a deep respect for client dignity — she understands that accepting personal care assistance can be emotionally difficult and takes great care to make every interaction feel respectful and comfortable.\n\nShe is highly skilled in all aspects of personal hygiene support including bathing, grooming, oral care, skin care, and dressing. She is particularly experienced in working with clients who have reduced mobility, skin conditions, or who are post-operative.\n\nLinda speaks English and Spanish, and her ability to communicate in a client's preferred language has made her a beloved figure in the local bilingual community.", avail: "Mon – Sat", lang: ["English","Spanish"], cert: "Certified Nursing Assistant (CNA)", education: "CNA Certification · Skin Care Specialist Training", video: "https://videos.pexels.com/video-files/5752729/5752729-uhd_2560_1440_25fps.mp4", stats: [["196","Reviews"],["10 yrs","Experience"],["4.9★","Rating"],["350+","Clients Helped"]] },
    { name: "Grace Okafor", role: "Hygiene Care Aide", exp: "6 yrs", rating: 4.7, reviews: 108, photo: "https://images.pexels.com/photos/6129967/pexels-photo-6129967.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Skin Care","Oral Hygiene","Dressing Assist"], bio: "Grace specialises in comprehensive hygiene routines including skin and oral care, ensuring clients feel refreshed, comfortable, and cared for every day.", fullBio: "Grace Okafor brings a cheerful, professional presence to personal care that has made her a favourite among clients. Her 6 years of experience span both residential care home settings and private home care, giving her a broad range of skills and a calm adaptability to different client needs.\n\nShe specialises in comprehensive hygiene routines, with particular expertise in skin care protocols that have helped several clients with chronic skin conditions see meaningful improvement. Her approach to oral hygiene is equally meticulous — she understands its importance in overall health and infection prevention.\n\nGrace approaches every task with a warmth and cheerfulness that puts even anxious clients at ease.", avail: "Mon – Fri", lang: ["English","French"], cert: "Home Health Aide (HHA)", education: "HHA Certification · Skin Care & Wound Care Training", video: "https://videos.pexels.com/video-files/6129122/6129122-uhd_2560_1440_25fps.mp4", stats: [["108","Reviews"],["6 yrs","Experience"],["4.7★","Rating"],["190+","Clients Helped"]] },
  ],
  "Meal Preparation": [
    { name: "Emma Thompson", role: "Nutrition & Care Cook", exp: "12 yrs", rating: 4.9, reviews: 223, photo: "https://images.pexels.com/photos/3807571/pexels-photo-3807571.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Diabetic Meals","Meal Planning","Allergen-Free"], bio: "Emma is a trained culinary professional with a nutrition background. She crafts balanced, delicious meals tailored to each client's dietary needs and preferences.", fullBio: "Emma Thompson is a rare combination of trained chef and nutrition specialist, making her one of the most sought-after meal preparation caregivers on the team. With 12 years of experience, she has worked with clients managing a wide range of dietary conditions including diabetes, renal disease, heart conditions, and food allergies.\n\nShe approaches each client by first conducting a thorough dietary and preference assessment, then building a rotating menu plan that is both medically appropriate and genuinely enjoyable to eat. Several of Emma's clients have reported measurable improvements in their health markers — better blood sugar levels, improved cholesterol, and increased energy — directly attributable to their improved nutrition.\n\nEmma also takes time to source quality ingredients and adapt beloved recipes into healthier versions that clients can still look forward to.", avail: "All Week", lang: ["English"], cert: "ServSafe Certified, Nutrition Diploma", education: "Culinary Arts Diploma · Nutrition Science Certificate · ServSafe Certification", video: "https://videos.pexels.com/video-files/7551465/7551465-uhd_2560_1440_25fps.mp4", stats: [["223","Reviews"],["12 yrs","Experience"],["4.9★","Rating"],["400+","Clients Helped"]] },
    { name: "David Chen", role: "Dietary Care Aide", exp: "7 yrs", rating: 4.8, reviews: 145, photo: "https://images.pexels.com/photos/4253320/pexels-photo-4253320.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Low-Sodium Diets","Cultural Cuisines","Grocery Sourcing"], bio: "David brings diverse culinary expertise and a passion for nutrition, preparing culturally sensitive meals that clients genuinely look forward to.", fullBio: "David Chen is a dietary care aide with a deep love of food and a genuine passion for nutrition. His 7 years of experience span restaurant kitchens and home care settings, giving him an unusual ability to make therapeutic diets taste genuinely good.\n\nHe specialises in low-sodium cooking, which requires creativity and technique to maintain flavour without salt. His cultural sensitivity in meal preparation is particularly valued — he researches and recreates clients' favourite traditional dishes within their dietary restrictions, giving them a meaningful connection to their food heritage.\n\nDavid also handles grocery sourcing, carefully selecting fresh, quality ingredients and managing budgets efficiently.", avail: "Mon – Sat", lang: ["English","Mandarin"], cert: "Certified Dietary Manager", education: "Culinary Certificate · Certified Dietary Manager (CDM)", video: "https://videos.pexels.com/video-files/5752729/5752729-uhd_2560_1440_25fps.mp4", stats: [["145","Reviews"],["7 yrs","Experience"],["4.8★","Rating"],["250+","Clients Helped"]] },
  ],
  "Physical Therapy": [
    { name: "Sophie Park", role: "Lead Physiotherapist", exp: "15 yrs", rating: 5.0, reviews: 312, photo: "https://images.pexels.com/photos/5473182/pexels-photo-5473182.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Stroke Rehab","Orthopedic","Post-Surgery Recovery"], bio: "Sophie is an award-winning physiotherapist specialising in neurological and orthopaedic rehabilitation. Her evidence-based programmes have helped hundreds regain independence.", fullBio: "Sophie Park is CareNest's lead physiotherapist and one of the most decorated practitioners in home-based rehabilitation. With 15 years of clinical experience — including 8 years in a specialist neurological rehabilitation unit — she brings exceptional expertise to her in-home programmes.\n\nShe has helped hundreds of clients recover from strokes, orthopaedic surgeries, and neurological conditions, often achieving outcomes that exceed what was considered possible. Her programmes are entirely evidence-based, drawing on the latest research in motor learning, neuroplasticity, and pain management.\n\nSophie believes passionately in setting ambitious goals with clients and families, then working systematically and patiently toward them. Her calm, encouraging manner keeps clients motivated even through difficult plateaus in recovery.", avail: "Mon – Sat", lang: ["English","Korean"], cert: "DPT, Certified Neurological PT", education: "DPT, Seoul National University · Certified Neurological Clinical Specialist · Post-Doctoral Fellowship in Neurorehabilitation", video: "https://videos.pexels.com/video-files/3196716/3196716-uhd_2560_1440_25fps.mp4", stats: [["312","Reviews"],["15 yrs","Experience"],["5.0★","Rating"],["700+","Clients Helped"]] },
    { name: "Marcus Williams", role: "Rehabilitation Specialist", exp: "10 yrs", rating: 4.9, reviews: 198, photo: "https://images.pexels.com/photos/6975060/pexels-photo-6975060.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Sports Recovery","Balance Training","Manual Therapy"], bio: "Marcus combines hands-on manual therapy with personalised exercise programmes, helping clients restore mobility, strength, and confidence at home.", fullBio: "Marcus Williams is a highly skilled rehabilitation specialist whose career began in professional sports medicine before transitioning to in-home care. This background gives him an exceptional understanding of movement, biomechanics, and the psychology of recovery.\n\nHe specialises in balance training — a critical area for elderly clients where improving stability can dramatically reduce fall risk and restore confidence. His manual therapy skills are also outstanding, combining joint mobilisation, soft tissue work, and therapeutic exercise into cohesive, progressive programmes.\n\nMarcus has a gift for explaining anatomy and movement in simple, understandable terms, and for motivating clients to push past their perceived limits in a safe and encouraging environment.", avail: "Tue – Sun", lang: ["English"], cert: "MPT, Certified Manual Therapist", education: "MPT, University of Southern California · Certified Manual Physical Therapist · Sports Medicine Certification", video: "https://videos.pexels.com/video-files/6129122/6129122-uhd_2560_1440_25fps.mp4", stats: [["198","Reviews"],["10 yrs","Experience"],["4.9★","Rating"],["400+","Clients Helped"]] },
    { name: "Dr. Yasmin Hassan", role: "Occupational Therapist", exp: "13 yrs", rating: 4.8, reviews: 167, photo: "https://images.pexels.com/photos/5327921/pexels-photo-5327921.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["ADL Training","Home Adaptation","Cognitive Rehab"], bio: "Dr. Hassan empowers clients to regain independence in daily activities through targeted occupational therapy and strategic home environment adaptations.", fullBio: "Dr. Yasmin Hassan is an occupational therapist with 13 years of experience helping clients rebuild independence in the activities that matter most to them. Her work spans physical rehabilitation, cognitive therapy, and the often-overlooked area of environmental adaptation — modifying the home itself to support better function.\n\nShe holds a doctoral-level qualification and has published research on home adaptation strategies for patients with neurological conditions. Her ADL (Activities of Daily Living) training programmes are renowned for their creativity and effectiveness — she finds ways to restore function that other practitioners have not thought to try.\n\nDr. Hassan speaks English and Arabic and brings both clinical excellence and deep cultural sensitivity to her practice.", avail: "Mon – Fri", lang: ["English","Arabic"], cert: "OTD, BCPR", education: "OTD (Doctor of Occupational Therapy) · Board Certified in Physical Rehabilitation · Published Researcher", video: "https://videos.pexels.com/video-files/7551465/7551465-uhd_2560_1440_25fps.mp4", stats: [["167","Reviews"],["13 yrs","Experience"],["4.8★","Rating"],["320+","Clients Helped"]] },
  ],
  "Companionship": [
    { name: "Thomas Briggs", role: "Companion Care Specialist", exp: "8 yrs", rating: 4.9, reviews: 176, photo: "https://images.pexels.com/photos/3831645/pexels-photo-3831645.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Social Engagement","Hobbies Support","Outings"], bio: "Thomas is a natural conversationalist and empathetic listener who brings genuine warmth to every visit, helping clients feel connected, valued, and understood.", fullBio: "Thomas Briggs has devoted 8 years to the art of companionship care, understanding that loneliness and social isolation are among the most serious health risks facing elderly individuals today. He brings genuine warmth, curiosity, and energy to every visit, making him one of the most requested companion care specialists at CareNest.\n\nHe excels at discovering shared interests with clients — whether that is a sport, a television era, a musical genre, or a life experience — and using that common ground to build meaningful relationships that clients genuinely look forward to. He has accompanied clients to galleries, parks, cinema screenings, and family events.\n\nBeyond entertainment, Thomas is a skilled and attentive listener, providing emotional support and helping clients process feelings of grief, loss, or transition with sensitivity and patience.", avail: "All Week", lang: ["English"], cert: "Companion Care Certified", education: "Psychology BSc · Companion Care Specialist Certification · Mental Health First Aid", video: "https://videos.pexels.com/video-files/3196716/3196716-uhd_2560_1440_25fps.mp4", stats: [["176","Reviews"],["8 yrs","Experience"],["4.9★","Rating"],["300+","Clients Helped"]] },
    { name: "Amara Diallo", role: "Wellness Companion", exp: "5 yrs", rating: 4.8, reviews: 119, photo: "https://images.pexels.com/photos/7551617/pexels-photo-7551617.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Mental Wellness","Arts & Crafts","Memory Games"], bio: "Amara combines companionship with mental wellness activities, using creative therapies and reminiscence techniques to keep clients mentally active and cheerful.", fullBio: "Amara Diallo is a wellness companion who brings a creative, therapeutic dimension to companionship care. With training in arts-based therapy and memory care, she designs sessions that are not just enjoyable but cognitively stimulating and emotionally nurturing.\n\nHer sessions often incorporate painting, collage, music, storytelling, and reminiscence exercises — activities that research shows can slow cognitive decline and significantly improve mood and sense of purpose in elderly clients. Several families have noted marked improvements in their loved one's alertness and happiness since Amara began her visits.\n\nAmara is multilingual, speaking English, French, and Wolof, and brings a joyful cultural richness to her work that clients of diverse backgrounds respond to warmly.", avail: "Mon – Sat", lang: ["English","French","Wolof"], cert: "Mental Health First Aid Cert.", education: "Arts Therapy Certificate · Mental Health First Aid · Memory Care Specialist Training", video: "https://videos.pexels.com/video-files/6129122/6129122-uhd_2560_1440_25fps.mp4", stats: [["119","Reviews"],["5 yrs","Experience"],["4.8★","Rating"],["200+","Clients Helped"]] },
  ],
  "Transportation": [
    { name: "Carlos Mendes", role: "Transport & Care Aide", exp: "8 yrs", rating: 4.8, reviews: 131, photo: "https://images.pexels.com/photos/6749778/pexels-photo-6749778.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Wheelchair Accessible","Medical Appts","Errand Running"], bio: "Carlos ensures every journey is safe, comfortable, and stress-free. His vehicle is fully wheelchair-accessible and equipped for medical transport needs.", fullBio: "Carlos Mendes provides a transportation service that goes far beyond simply driving. His EMT background means he is fully equipped to handle any medical situation that might arise during transit, and his vehicle is purpose-fitted with wheelchair accessibility and basic medical supplies.\n\nHe accompanies clients into appointments, carries shopping, waits patiently for as long as needed, and provides a friendly, reassuring presence throughout every outing. For clients who dread medical appointments, Carlos has repeatedly been described as the reason they are able to attend at all.\n\nHis Portuguese language skills also enable him to support clients from Lusophone communities who struggle with English-language healthcare settings.", avail: "All Week", lang: ["English","Portuguese"], cert: "EMT-Basic, Defensive Driving Cert.", education: "EMT Certification · Advanced Defensive Driving · First Aid & CPR", video: "https://videos.pexels.com/video-files/7551465/7551465-uhd_2560_1440_25fps.mp4", stats: [["131","Reviews"],["8 yrs","Experience"],["4.8★","Rating"],["260+","Clients Helped"]] },
    { name: "Patricia Cole", role: "Senior Transport Specialist", exp: "6 yrs", rating: 4.7, reviews: 94, photo: "https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Community Outings","Hospital Visits","Grocery Trips"], bio: "Patricia is a patient, careful driver dedicated to giving seniors their independence back. She assists with boarding, carries items, and waits as needed.", fullBio: "Patricia Cole understands that maintaining independence and connection to the community is vital to elderly wellbeing. Her transportation service is designed not just for medical appointments but for all the trips that make life meaningful — shopping, visiting friends, attending services, or simply enjoying an outing.\n\nShe is an exceptionally careful and patient driver who helps clients board and disembark safely, carries bags, and stays with them throughout appointments if needed. Her warm, unhurried manner makes her journeys feel like a pleasure rather than a chore.\n\nPatricias's NHTSA Safe Driver certification reflects her commitment to keeping clients safe on every journey, whatever the conditions.", avail: "Mon – Sat", lang: ["English"], cert: "NHTSA Safe Driver Certification", education: "NHTSA Safe Driver Certification · First Aid Training · Senior Care Transport Specialist", video: "https://videos.pexels.com/video-files/5752729/5752729-uhd_2560_1440_25fps.mp4", stats: [["94","Reviews"],["6 yrs","Experience"],["4.7★","Rating"],["180+","Clients Helped"]] },
  ],
  "Housekeeping": [
    { name: "Maria Santos", role: "Home Care Specialist", exp: "9 yrs", rating: 4.9, reviews: 204, photo: "https://images.pexels.com/photos/4107278/pexels-photo-4107278.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Deep Cleaning","Laundry","Home Organisation"], bio: "Maria takes pride in creating clean, safe, and welcoming home environments. Her thorough and efficient approach ensures every corner is cared for.", fullBio: "Maria Santos brings nine years of professional home care experience and an eye for detail that consistently surpasses client expectations. She approaches each home with genuine care, understanding that a clean, well-organised environment is not a luxury but a health and safety necessity for vulnerable individuals.\n\nHer deep cleaning routines are comprehensive and systematic, covering areas that many overlook. She is also skilled at home organisation — helping clients create practical, safe layouts that reduce fall risks and make daily life more manageable.\n\nMaria handles laundry, bed changes, and kitchen hygiene with the same thoroughness as all other tasks, and is known for her trustworthiness and discretion in clients' private spaces.", avail: "Mon – Sat", lang: ["English","Portuguese"], cert: "Professional Housekeeper Cert.", education: "Professional Housekeeper Certification · Home Safety & Infection Control Training", video: "https://videos.pexels.com/video-files/6129122/6129122-uhd_2560_1440_25fps.mp4", stats: [["204","Reviews"],["9 yrs","Experience"],["4.9★","Rating"],["380+","Clients Helped"]] },
    { name: "Kevin O'Brien", role: "Domestic Care Aide", exp: "5 yrs", rating: 4.7, reviews: 87, photo: "https://images.pexels.com/photos/5463558/pexels-photo-5463558.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Light Cleaning","Safety Checks","Errands"], bio: "Kevin is reliable and detail-oriented, focusing on keeping clients' homes tidy and hazard-free while also assisting with light errands and tasks.", fullBio: "Kevin O'Brien has been providing domestic care support for 5 years and has developed a sharp eye for the safety aspects of home environments that are often overlooked. Beyond cleaning and tidying, he actively assesses homes for hazards — loose rugs, poor lighting, cluttered walkways — and addresses them proactively.\n\nHis errand assistance is highly valued by clients who can no longer drive or manage shopping independently. He is trustworthy, organised, and careful with finances when managing shopping budgets on clients' behalf.\n\nKevin brings a positive, cheerful energy to every visit and is often described by clients as someone who feels like a trustworthy family friend rather than an aide.", avail: "All Week", lang: ["English"], cert: "Home Safety Certified", education: "Home Safety Certification · Domestic Care Aide Training · First Aid", video: "https://videos.pexels.com/video-files/7551465/7551465-uhd_2560_1440_25fps.mp4", stats: [["87","Reviews"],["5 yrs","Experience"],["4.7★","Rating"],["150+","Clients Helped"]] },
  ],
  "Overnight Care": [
    { name: "Linda Rivera", role: "Night Care Specialist", exp: "10 yrs", rating: 4.9, reviews: 196, photo: "https://images.pexels.com/photos/7579831/pexels-photo-7579831.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Overnight Supervision","Fall Prevention","Emergency Response"], bio: "Linda provides a reassuring overnight presence, monitoring clients through the night and responding calmly and effectively to any needs that arise.", fullBio: "Linda Rivera is an experienced overnight care specialist who provides a reassuring and vigilant presence through the night for clients who need continuous support. Her decade of experience includes working with post-surgical patients, those with dementia-related night-time distress, and clients with fall risk.\n\nShe is exceptionally skilled at maintaining awareness through overnight shifts without disrupting client sleep — checking in at appropriate intervals while ensuring the client has the quiet rest they need. When issues arise, Linda responds with calm speed and clear communication with family and medical teams.\n\nHer CPR and emergency response certifications mean families can sleep soundly knowing their loved one is genuinely safe.", avail: "Overnight Shifts", lang: ["English","Spanish"], cert: "CNA, CPR Certified", education: "CNA Certification · CPR & Emergency Response · Night Care Specialist Training", video: "https://videos.pexels.com/video-files/3196716/3196716-uhd_2560_1440_25fps.mp4", stats: [["196","Reviews"],["10 yrs","Experience"],["4.9★","Rating"],["350+","Clients Helped"]] },
    { name: "James Kowalski", role: "Night RN", exp: "14 yrs", rating: 4.9, reviews: 267, photo: "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg?auto=compress&cs=tinysrgb&w=600", tags: ["Medical Monitoring","IV Overnight","Critical Care"], bio: "James provides medically complex overnight care for clients needing continuous nursing supervision, bringing hospital-grade vigilance to the home setting.", fullBio: "James Kowalski's overnight nursing service is reserved for clients with complex medical needs that require continuous, professional clinical supervision through the night. Drawing on his ICU nursing background, he provides hospital-grade monitoring of vital signs, medication management, IV therapy oversight, and wound care in the comfort of the home environment.\n\nHe is especially experienced in managing post-operative patients who require close overnight observation, and in supporting clients with conditions that cause night-time complications such as respiratory issues or cardiac events.\n\nFamilies consistently describe the peace of mind James provides as life-changing — knowing a fully qualified, experienced RN is watching over their loved one through every hour of the night.", avail: "Overnight 24/7", lang: ["English","Polish"], cert: "RN, BSN, Critical Care Certified", education: "BSN Nursing · Critical Care RN Certification · ICU Advanced Training", video: "https://videos.pexels.com/video-files/5752729/5752729-uhd_2560_1440_25fps.mp4", stats: [["267","Reviews"],["14 yrs","Experience"],["4.9★","Rating"],["600+","Clients Helped"]] },
  ],
};

const FEATURES = [
  { icon: "🏅", title: "Certified & Background Checked", desc: "All caregivers undergo rigorous screening and professional certification." },
  { icon: "⏰", title: "Available 24/7", desc: "Round-the-clock care availability for emergencies and scheduled visits." },
  { icon: "📋", title: "Personalized Care Plans", desc: "Custom plans designed around your loved one's unique needs." },
  { icon: "💙", title: "Compassionate Approach", desc: "We treat every client like family with warmth, patience, and genuine care." },
];

const TESTIMONIALS = [
  { stars: 5, text: "The care team transformed my mother's quality of life. Professional, warm, and absolutely dedicated.", name: "Sarah K.", role: "Daughter of client", initials: "SK" },
  { stars: 5, text: "After my surgery, the recovery at home was so much better thanks to their incredible support.", name: "Robert M.", role: "Post-surgery client", initials: "RM" },
  { stars: 5, text: "Their companionship service gave my father something to look forward to every day. Wonderful team.", name: "Priya A.", role: "Family member", initials: "PA" },
];

const INITIAL_BOOKINGS = [
  { id: "#B1042", client: "Martha Johnson", service: "Elder Care", caregiver: "Emma T.", date: "Apr 22", status: "confirmed" },
  { id: "#B1041", client: "George Williams", service: "Medical Assist.", caregiver: "James K.", date: "Apr 22", status: "confirmed" },
  { id: "#B1040", client: "Helen Carter", service: "Overnight Care", caregiver: "Linda R.", date: "Apr 21", status: "pending" },
  { id: "#B1039", client: "Frank Davis", service: "Transportation", caregiver: "Carlos M.", date: "Apr 20", status: "cancelled" },
  { id: "#B1038", client: "Patricia Lee", service: "Meal Prep", caregiver: "Emma T.", date: "Apr 19", status: "confirmed" },
];

const INITIAL_CLIENTS = [
  { id:"C001", name:"Martha Johnson",   service:"Elder Care",       status:"active" },
  { id:"C002", name:"George Williams",  service:"Medical Assist.",  status:"active" },
  { id:"C003", name:"Helen Carter",     service:"Overnight Care",   status:"active" },
  { id:"C004", name:"Frank Davis",      service:"Transportation",   status:"inactive" },
  { id:"C005", name:"Patricia Lee",     service:"Meal Prep",        status:"active" },
  { id:"C006", name:"Thomas Brown",     service:"Companionship",    status:"active" },
  { id:"C007", name:"Alice Morgan",     service:"Physical Therapy", status:"active" },
];

const INITIAL_CAREGIVERS = [
  { id:"CG01", nm:"Emma Thompson",  role:"Elder Care",       st:"on",  init:"ET" },
  { id:"CG02", nm:"James Kowalski", role:"Medical Aide",     st:"on",  init:"JK" },
  { id:"CG03", nm:"Linda Rivera",   role:"Night Caregiver",  st:"sc",  init:"LR" },
  { id:"CG04", nm:"Carlos Mendes",  role:"Transport Aide",   st:"on",  init:"CM" },
  { id:"CG05", nm:"Sophie Park",    role:"Therapist",        st:"brk", init:"SP" },
  { id:"CG06", nm:"David Chen",     role:"Companion Care",   st:"sc",  init:"DC" },
];
const CHART_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TIME_SLOTS = ["7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM"];
const UNAVAIL = [2, 5, 9];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Outfit:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --sage:#5a7c65;--sage-l:#7fa68a;--sage-d:#3d5747;
  --cream:#faf7f2;--warm:#fffef9;--gold:#c9a85c;--gold-l:#e8d4a0;
  --txt:#2a2a2a;--mid:#555;--light:#888;--bdr:#e8e0d5;
  --sh:0 4px 24px rgba(90,124,101,.10);--sh-lg:0 12px 48px rgba(90,124,101,.18);
}
html{scroll-behavior:smooth}
body{font-family:'Outfit',sans-serif;color:var(--txt);background:var(--warm);overflow-x:hidden}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:var(--cream)}
::-webkit-scrollbar-thumb{background:var(--sage-l);border-radius:3px}

/* NAVBAR */
.navbar{position:fixed;top:0;left:0;right:0;z-index:1000;padding:0 3rem;display:flex;align-items:center;justify-content:space-between;height:76px;transition:all .45s cubic-bezier(.4,0,.2,1)}
.navbar.scrolled{background:rgba(255,254,249,.97);backdrop-filter:blur(16px);box-shadow:0 2px 24px rgba(90,124,101,.10);height:66px}
.navbar.dark{background:rgba(25,38,25,.97);backdrop-filter:blur(16px)}
.nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer}
.nav-logo-mark{width:40px;height:40px;background:var(--sage);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:19px;transition:transform .3s}
.nav-logo:hover .nav-logo-mark{transform:rotate(-8deg) scale(1.08)}
.nav-logo-name{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:700;color:#fff;transition:color .3s}
.navbar.scrolled .nav-logo-name{color:var(--sage-d)}
.nav-links{display:flex;align-items:center;gap:.2rem;list-style:none}
.nav-li{position:relative}
.nav-li a{display:flex;align-items:center;gap:5px;padding:8px 14px;border-radius:10px;font-size:.88rem;font-weight:500;color:rgba(255,255,255,.88);text-decoration:none;cursor:pointer;transition:all .2s}
.nav-li a:hover{background:rgba(255,255,255,.12);color:#fff}
.navbar.scrolled .nav-li a{color:var(--mid)}
.navbar.scrolled .nav-li a:hover{background:var(--cream);color:var(--sage-d)}
.nav-drop{position:absolute;top:calc(100% + 8px);left:0;background:#fff;border-radius:16px;padding:.5rem;min-width:220px;box-shadow:0 12px 40px rgba(0,0,0,.12);border:1px solid var(--bdr);opacity:0;pointer-events:none;transform:translateY(8px);transition:all .22s ease}
.nav-li:hover .nav-drop{opacity:1;pointer-events:all;transform:translateY(0)}
.drop-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;cursor:pointer;font-size:.88rem;color:var(--mid);transition:all .15s}
.drop-item:hover{background:var(--cream);color:var(--sage-d)}
.drop-divider{border-top:1px solid var(--bdr);margin:4px 0}
.nav-right{display:flex;align-items:center;gap:10px}
.btn-book-nav{display:flex;align-items:center;gap:8px;padding:10px 22px;background:var(--gold);color:#fff;border:none;border-radius:50px;font-size:.88rem;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .25s;white-space:nowrap}
.btn-book-nav:hover{background:#b8923e;transform:translateY(-2px);box-shadow:0 6px 18px rgba(201,168,92,.45)}
.btn-admin-nav{padding:9px 18px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:50px;color:#fff;font-size:.82rem;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .2s}
.btn-admin-nav:hover{background:rgba(255,255,255,.2)}
.navbar.scrolled .btn-admin-nav{background:var(--cream);border-color:var(--bdr);color:var(--mid)}

/* VIDEO SLIDER */
.vslider{position:relative;height:100vh;overflow:hidden;background:#141e14}
.vslide{position:absolute;inset:0;opacity:0;transition:opacity 1.2s ease;pointer-events:none}
.vslide.active{opacity:1;pointer-events:all}
.vslide video{width:100%;height:100%;object-fit:cover;display:block}
.vslide.active video{animation:kbz 12s ease-in-out forwards}
@keyframes kbz{0%{transform:scale(1.08) translateX(0)}100%{transform:scale(1) translateX(-1%)}}
.vslide-ov{position:absolute;inset:0;background:linear-gradient(110deg,rgba(18,32,18,.80) 0%,rgba(40,60,40,.52) 55%,rgba(90,124,101,.20) 100%)}
.vslide-content{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;justify-content:center;padding:0 6rem;max-width:780px}
.vslide.active .vslide-content>*{animation:sUp .8s cubic-bezier(.22,1,.36,1) both}
.vslide.active .vsc-badge{animation-delay:.1s}
.vslide.active .vsc-title{animation-delay:.25s}
.vslide.active .vsc-desc{animation-delay:.4s}
.vslide.active .vsc-acts{animation-delay:.55s}
@keyframes sUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
.vsc-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:50px;background:rgba(201,168,92,.18);border:1px solid rgba(201,168,92,.5);color:var(--gold-l);font-size:.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin-bottom:1.4rem;width:fit-content}
.vsc-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--gold);display:block}
.vsc-title{font-family:'Cormorant Garamond',serif;font-size:clamp(2.8rem,5.5vw,4.4rem);font-weight:700;color:#fff;line-height:1.14;margin-bottom:1.3rem}
.vsc-title em{color:var(--gold-l);font-style:italic}
.vsc-desc{font-size:1.05rem;color:rgba(255,255,255,.78);line-height:1.85;margin-bottom:2.2rem;max-width:540px}
.vsc-acts{display:flex;gap:1rem;flex-wrap:wrap}
.btn-cta{display:flex;align-items:center;gap:8px;padding:15px 32px;background:var(--sage);color:#fff;border:none;border-radius:50px;font-size:.95rem;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .28s}
.btn-cta:hover{background:var(--sage-d);transform:translateY(-3px);box-shadow:0 8px 24px rgba(90,124,101,.45)}
.btn-ghost{display:flex;align-items:center;gap:8px;padding:15px 32px;background:rgba(255,255,255,.1);color:#fff;border:1.5px solid rgba(255,255,255,.5);border-radius:50px;font-size:.95rem;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .25s;backdrop-filter:blur(6px)}
.btn-ghost:hover{background:rgba(255,255,255,.2);transform:translateY(-2px)}
.vs-prog{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.12);z-index:20}
.vs-prog-bar{height:100%;background:var(--gold);animation:prog 6s linear forwards}
@keyframes prog{from{width:0}to{width:100%}}
.vs-dots{position:absolute;bottom:2.5rem;left:6rem;display:flex;gap:12px;z-index:20;align-items:center}
.vs-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.32);cursor:pointer;transition:all .35s;border:none;outline:none}
.vs-dot.active{background:var(--gold);width:32px;border-radius:4px}
.vs-num{position:absolute;bottom:2.5rem;right:6rem;z-index:20;color:rgba(255,255,255,.45);font-size:.82rem;display:flex;align-items:center;gap:10px}
.vs-num strong{color:#fff;font-size:1.1rem;font-weight:600}
.vs-arrows{position:absolute;right:6rem;top:50%;transform:translateY(-50%);z-index:20;display:flex;flex-direction:column;gap:10px}
.vs-arr{width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .22s;backdrop-filter:blur(6px)}
.vs-arr:hover{background:var(--gold);border-color:var(--gold);transform:scale(1.08)}
.vs-scroll{position:absolute;bottom:2.8rem;left:50%;transform:translateX(-50%);z-index:20;display:flex;flex-direction:column;align-items:center;gap:6px}
.vs-scroll-line{width:1px;height:44px;background:rgba(255,255,255,.28);animation:scPulse 1.8s ease-in-out infinite}
@keyframes scPulse{0%,100%{opacity:.28;transform:scaleY(.7)}50%{opacity:1;transform:scaleY(1)}}
.vs-scroll-txt{font-size:.67rem;color:rgba(255,255,255,.35);letter-spacing:.12em;text-transform:uppercase}

/* BOOKING MODAL */
.modal-ov{position:fixed;inset:0;z-index:9000;background:rgba(18,32,18,.68);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeOv .3s ease}
@keyframes fadeOv{from{opacity:0}to{opacity:1}}
.modal-box{background:#fff;border-radius:28px;width:100%;max-width:640px;max-height:92vh;overflow-y:auto;animation:mUp .42s cubic-bezier(.22,1,.36,1);box-shadow:0 32px 80px rgba(0,0,0,.28)}
@keyframes mUp{from{opacity:0;transform:translateY(44px) scale(.97)}to{opacity:1;transform:none}}
.modal-hd{position:sticky;top:0;background:#fff;z-index:10;padding:2rem 2.5rem 1.5rem;border-bottom:1px solid var(--bdr);display:flex;align-items:flex-start;justify-content:space-between;border-radius:28px 28px 0 0}
.modal-ttl{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:700;color:var(--txt)}
.modal-sub{font-size:.85rem;color:var(--light);margin-top:3px}
.modal-close{width:36px;height:36px;border-radius:50%;background:var(--cream);border:none;cursor:pointer;font-size:1rem;color:var(--mid);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
.modal-close:hover{background:#f0e8df;color:var(--txt)}
.modal-body{padding:2rem 2.5rem 2.5rem}
.modal-steps{display:flex;align-items:center;margin-bottom:2rem}
.m-step{display:flex;align-items:center;flex:1}
.m-step-circle{width:28px;height:28px;border-radius:50%;background:var(--bdr);color:var(--light);display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:700;flex-shrink:0;transition:all .3s}
.m-step.active .m-step-circle{background:var(--sage);color:#fff}
.m-step.done .m-step-circle{background:var(--sage-l);color:#fff}
.m-step-line{flex:1;height:2px;background:var(--bdr);margin:0 8px;transition:background .3s}
.m-step-line.done{background:var(--sage-l)}
.mf-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
.mf-g{margin-bottom:1rem;display:flex;flex-direction:column}
.mf-l{font-size:.82rem;font-weight:600;color:var(--mid);margin-bottom:6px;letter-spacing:.02em}
.mf-i{padding:11px 16px;border:1.5px solid var(--bdr);border-radius:12px;font-size:.92rem;font-family:'Outfit',sans-serif;color:var(--txt);background:var(--cream);transition:border-color .2s,background .2s;outline:none;width:100%}
.mf-i:focus{border-color:var(--sage);background:#fff}
.svc-tiles{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-bottom:1.2rem}
.svc-tile{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;border:1.5px solid var(--bdr);cursor:pointer;transition:all .2s;background:var(--cream)}
.svc-tile:hover{border-color:var(--sage-l);background:#f0f6f2}
.svc-tile.sel{border-color:var(--sage);background:#e8f5ee}
.time-slots{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.8rem}
.t-slot{padding:9px;text-align:center;border-radius:10px;border:1.5px solid var(--bdr);cursor:pointer;font-size:.82rem;font-weight:500;color:var(--mid);transition:all .2s;background:var(--cream)}
.t-slot:hover{border-color:var(--sage-l);color:var(--sage)}
.t-slot.sel{background:var(--sage);border-color:var(--sage);color:#fff}
.t-slot.na{opacity:.35;cursor:not-allowed;pointer-events:none}
.booking-success{text-align:center;padding:1rem 0 .5rem}
.suc-circle{width:72px;height:72px;border-radius:50%;background:#e8f5ee;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 1.2rem}
.suc-ttl{font-family:'Cormorant Garamond',serif;font-size:1.8rem;font-weight:700;color:var(--sage-d);margin-bottom:.6rem}
.suc-msg{font-size:.92rem;color:var(--mid);line-height:1.75}
.bk-ref{display:inline-block;margin-top:1rem;padding:8px 20px;background:var(--cream);border-radius:50px;border:1px solid var(--bdr);font-size:.85rem;color:var(--mid)}
.bk-ref strong{color:var(--sage-d)}
.modal-ft{display:flex;justify-content:space-between;align-items:center;padding-top:1.5rem;border-top:1px solid var(--bdr);margin-top:1rem}
.btn-mb{padding:11px 24px;background:var(--cream);border:1px solid var(--bdr);border-radius:50px;font-size:.88rem;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;color:var(--mid);transition:all .2s}
.btn-mb:hover{background:#f0e8df}
.btn-mn{padding:11px 30px;background:var(--sage);color:#fff;border:none;border-radius:50px;font-size:.9rem;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .25s}
.btn-mn:hover{background:var(--sage-d);transform:translateY(-2px);box-shadow:0 6px 18px rgba(90,124,101,.35)}
.btn-mn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}

/* SECTIONS */
.section{padding:7rem 6rem}
.section-alt{background:var(--cream)}
.container{max-width:1200px;margin:0 auto}
.eyebrow{display:inline-flex;align-items:center;gap:10px;color:var(--sage);font-size:.78rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;margin-bottom:1rem}
.eyebrow::before{content:'';width:30px;height:2px;background:var(--sage);display:block}
.sec-h{font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3.8vw,3rem);font-weight:700;line-height:1.2;margin-bottom:1rem;color:var(--txt)}
.sec-sub{font-size:1rem;color:var(--mid);line-height:1.85;max-width:540px}
.stats-bar{background:var(--sage-d);padding:2.2rem 6rem;display:flex;justify-content:center;gap:5rem}
.stat-item{text-align:center}
.stat-val{font-family:'Cormorant Garamond',serif;font-size:2.5rem;font-weight:700;color:var(--gold-l)}
.stat-lbl{font-size:.8rem;color:rgba(255,255,255,.6);letter-spacing:.08em;margin-top:4px}
.svc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.6rem;margin-top:3.5rem}
.svc-card{background:#fff;border-radius:22px;padding:2rem 1.8rem;border:1px solid var(--bdr);transition:all .38s cubic-bezier(.22,1,.36,1);position:relative;overflow:hidden}
.svc-card::after{content:'';position:absolute;left:0;bottom:0;top:0;width:4px;background:var(--sage);transform:scaleY(0);transform-origin:bottom;transition:transform .38s cubic-bezier(.22,1,.36,1);border-radius:0 0 0 22px}
.svc-card:hover{transform:translateY(-7px);box-shadow:var(--sh-lg);border-color:transparent}
.svc-card:hover::after{transform:scaleY(1)}
.svc-icon{width:54px;height:54px;border-radius:16px;background:#f0f7f2;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1.3rem;transition:background .3s}
.svc-card:hover .svc-icon{background:var(--sage)}
.svc-nm{font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:700;margin-bottom:.6rem}
.svc-ds{font-size:.88rem;color:var(--mid);line-height:1.78}
.why-split{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center}
.why-vis{border-radius:28px;overflow:hidden;height:500px;position:relative;background:linear-gradient(140deg,var(--sage-l),var(--sage-d));display:flex;align-items:center;justify-content:center}
.why-vis-em{font-size:9rem;opacity:.55}
.why-award{position:absolute;bottom:2rem;left:2rem;right:2rem;background:rgba(255,254,249,.97);border-radius:18px;padding:1.2rem 1.4rem;display:flex;gap:1rem;align-items:center;box-shadow:0 8px 32px rgba(0,0,0,.1)}
.why-award-bdg{font-size:2rem}
.why-award-txt strong{display:block;font-size:.95rem;font-weight:600;color:var(--txt)}
.why-award-txt span{font-size:.8rem;color:var(--mid)}
.why-feats{display:flex;flex-direction:column;gap:1rem;margin-top:2.2rem}
.why-feat{display:flex;gap:1rem;padding:1.1rem 1.3rem;border-radius:16px;background:#fff;border:1px solid var(--bdr);transition:box-shadow .25s,transform .25s}
.why-feat:hover{box-shadow:var(--sh);transform:translateX(4px)}
.wf-icon{width:44px;height:44px;border-radius:12px;background:#f0f7f2;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0}
.wf-ttl{font-weight:600;font-size:.94rem}
.wf-ds{font-size:.85rem;color:var(--mid);line-height:1.65;margin-top:2px}
.about-split{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center}
.about-vis{border-radius:28px;height:460px;background:linear-gradient(135deg,#e8d4a0 0%,var(--sage-l) 100%);display:flex;align-items:center;justify-content:center;font-size:8rem;position:relative}
.about-bdg{position:absolute;top:2.5rem;right:-1.8rem;background:var(--sage-d);border-radius:20px;padding:1.2rem 1.8rem;text-align:center;box-shadow:var(--sh-lg)}
.about-bdg-num{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:var(--gold-l)}
.about-bdg-lbl{font-size:.76rem;color:rgba(255,255,255,.7);margin-top:2px}
.about-prose p{font-size:.97rem;color:var(--mid);line-height:1.9;margin-bottom:1.2rem}
.about-vals{display:flex;gap:2rem;margin-top:2rem}
.about-val{text-align:center}
.av-icon{font-size:1.6rem;margin-bottom:5px}
.av-lbl{font-size:.78rem;color:var(--mid);font-weight:600;letter-spacing:.04em}
.testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:3rem}
.testi-card{background:#fff;border-radius:22px;padding:1.8rem;border:1px solid var(--bdr);transition:box-shadow .3s,transform .3s}
.testi-card:hover{box-shadow:var(--sh-lg);transform:translateY(-4px)}
.testi-stars{color:var(--gold);font-size:.88rem;letter-spacing:2px;margin-bottom:1rem}
.testi-txt{font-size:.92rem;color:var(--mid);line-height:1.82;font-style:italic;margin-bottom:1.2rem}
.testi-auth{display:flex;align-items:center;gap:10px}
.testi-av{width:42px;height:42px;border-radius:50%;background:var(--sage);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.88rem}
.testi-nm{font-weight:600;font-size:.9rem}
.testi-role{font-size:.77rem;color:var(--light)}
.cta-banner{background:var(--sage);padding:3.5rem 6rem;text-align:center}
.cta-h{font-family:'Cormorant Garamond',serif;font-size:clamp(1.6rem,3vw,2.4rem);color:#fff;font-weight:700;margin-bottom:.8rem}
.cta-sub{color:rgba(255,255,255,.78);margin-bottom:1.8rem;font-size:1rem}
.btn-cta-wht{display:inline-flex;align-items:center;gap:8px;padding:14px 36px;background:#fff;color:var(--sage-d);border:none;border-radius:50px;font-size:1rem;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .25s}
.btn-cta-wht:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.15)}
.contact-split{display:grid;grid-template-columns:1fr 1.5fr;gap:4rem}
.contact-items{display:flex;flex-direction:column;gap:1.4rem;margin-top:2rem}
.c-item{display:flex;gap:1rem;align-items:flex-start}
.c-icon{width:46px;height:46px;border-radius:14px;background:var(--sage);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0}
.c-lbl{font-weight:600;font-size:.9rem;margin-bottom:3px}
.c-val{font-size:.87rem;color:var(--mid);line-height:1.65}
.cf-box{background:#fff;border-radius:26px;padding:2.5rem;border:1px solid var(--bdr);box-shadow:var(--sh)}
.cf-box h3{font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:700;margin-bottom:1.6rem}
.cf-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
.cf-g{margin-bottom:1rem}
.cf-l{font-size:.83rem;font-weight:600;color:var(--mid);margin-bottom:6px;display:block}
.cf-i{width:100%;padding:11px 16px;border:1.5px solid var(--bdr);border-radius:12px;font-size:.9rem;font-family:'Outfit',sans-serif;color:var(--txt);background:var(--cream);transition:border-color .2s;outline:none}
.cf-i:focus{border-color:var(--sage);background:#fff}
.cf-ta{resize:vertical;min-height:100px}
.cf-sub{width:100%;padding:13px;background:var(--sage);color:#fff;border:none;border-radius:50px;font-size:.93rem;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .25s}
.cf-sub:hover{background:var(--sage-d);transform:translateY(-2px);box-shadow:0 6px 20px rgba(90,124,101,.35)}
.footer{background:var(--sage-d);padding:4.5rem 6rem 2rem}
.footer-top{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:3rem;margin-bottom:3.5rem}
.footer-brand{font-family:'Cormorant Garamond',serif;font-size:1.5rem;color:#fff;font-weight:700;margin-bottom:.8rem;display:flex;align-items:center;gap:10px}
.footer-brand-mark{width:36px;height:36px;background:var(--sage);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px}
.footer-desc{font-size:.87rem;color:rgba(255,255,255,.5);line-height:1.85}
.footer-col-ttl{font-size:.78rem;font-weight:700;color:var(--gold-l);letter-spacing:.1em;text-transform:uppercase;margin-bottom:1.2rem}
.footer-links{list-style:none;display:flex;flex-direction:column;gap:.65rem}
.footer-links a{font-size:.87rem;color:rgba(255,255,255,.5);text-decoration:none;cursor:pointer;transition:color .2s}
.footer-links a:hover{color:var(--gold-l)}
.footer-bt{border-top:1px solid rgba(255,255,255,.1);padding-top:2rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}
.footer-copy{font-size:.8rem;color:rgba(255,255,255,.35)}
.footer-legal{display:flex;gap:1.5rem}
.footer-legal a{font-size:.78rem;color:rgba(255,255,255,.35);cursor:pointer;transition:color .2s}
.footer-legal a:hover{color:rgba(255,255,255,.7)}

/* ADMIN AUTH */
.auth-page{min-height:100vh;display:flex;align-items:stretch;background:var(--warm);font-family:'Outfit',sans-serif}
.auth-left{flex:1;background:linear-gradient(145deg,var(--sage-d) 0%,#2a4a35 50%,#1a3025 100%);display:flex;flex-direction:column;justify-content:space-between;padding:3.5rem;position:relative;overflow:hidden;min-width:0}
.auth-left::before{content:'';position:absolute;top:-80px;right:-80px;width:400px;height:400px;border-radius:50%;background:rgba(201,168,92,.1);pointer-events:none}
.auth-left::after{content:'';position:absolute;bottom:-100px;left:-60px;width:320px;height:320px;border-radius:50%;background:rgba(255,255,255,.04);pointer-events:none}
.auth-brand{display:flex;align-items:center;gap:12px;z-index:1}
.auth-brand-mark{width:46px;height:46px;background:var(--gold);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px}
.auth-brand-name{font-family:'Cormorant Garamond',serif;font-size:1.8rem;font-weight:700;color:#fff}
.auth-hero{z-index:1}
.auth-hero-badge{display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:50px;background:rgba(201,168,92,.18);border:1px solid rgba(201,168,92,.4);color:var(--gold-l);font-size:.75rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin-bottom:1.8rem}
.auth-hero h2{font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,3.5vw,3rem);font-weight:700;color:#fff;line-height:1.2;margin-bottom:1.2rem}
.auth-hero h2 em{color:var(--gold-l);font-style:italic}
.auth-hero p{font-size:.95rem;color:rgba(255,255,255,.65);line-height:1.85;max-width:360px}
.auth-perks{display:flex;flex-direction:column;gap:.9rem;z-index:1}
.auth-perk{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09)}
.auth-perk-ico{font-size:1.3rem;width:36px;text-align:center;flex-shrink:0}
.auth-perk-txt strong{display:block;font-size:.88rem;font-weight:600;color:#fff;margin-bottom:2px}
.auth-perk-txt span{font-size:.78rem;color:rgba(255,255,255,.5)}
.auth-right{flex:1;display:flex;align-items:center;justify-content:center;padding:3rem 4rem;min-width:0;max-width:600px}
.auth-form-wrap{width:100%;max-width:440px}
.auth-tabs{display:flex;gap:4px;background:var(--cream);border-radius:14px;padding:5px;margin-bottom:2.2rem;border:1px solid var(--bdr)}
.auth-tab{flex:1;padding:10px;border:none;background:none;border-radius:10px;font-size:.88rem;font-weight:600;font-family:'Outfit',sans-serif;color:var(--light);cursor:pointer;transition:all .22s}
.auth-tab.active{background:#fff;color:var(--sage-d);box-shadow:0 2px 12px rgba(90,124,101,.12)}
.auth-form-ttl{font-family:'Cormorant Garamond',serif;font-size:1.9rem;font-weight:700;color:var(--txt);margin-bottom:.4rem}
.auth-form-sub{font-size:.87rem;color:var(--light);margin-bottom:2rem;line-height:1.6}
.af-row{display:grid;grid-template-columns:1fr 1fr;gap:.9rem;margin-bottom:.9rem}
.af-g{margin-bottom:.9rem;position:relative}
.af-l{display:block;font-size:.8rem;font-weight:600;color:var(--mid);margin-bottom:6px;letter-spacing:.02em}
.af-i{width:100%;padding:12px 16px;border:1.5px solid var(--bdr);border-radius:12px;font-size:.92rem;font-family:'Outfit',sans-serif;color:var(--txt);background:var(--cream);transition:border-color .2s,background .2s,box-shadow .2s;outline:none}
.af-i:focus{border-color:var(--sage);background:#fff;box-shadow:0 0 0 3px rgba(90,124,101,.1)}
.af-i.err{border-color:#e05555}
.af-err{font-size:.75rem;color:#e05555;margin-top:4px}
.af-pw-wrap{position:relative}
.af-pw-wrap .af-i{padding-right:46px}
.af-pw-eye{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--light);font-size:.95rem;padding:4px;transition:color .2s}
.af-pw-eye:hover{color:var(--sage)}
.af-strength{display:flex;gap:4px;margin-top:7px}
.af-str-bar{flex:1;height:3px;border-radius:2px;background:var(--bdr);transition:background .3s}
.af-str-bar.w{background:#e05555}
.af-str-bar.m{background:#e0a020}
.af-str-bar.s{background:var(--sage)}
.af-str-txt{font-size:.73rem;color:var(--light);margin-top:4px}
.af-role-grid{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-bottom:.9rem}
.af-role-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border-radius:14px;border:1.5px solid var(--bdr);cursor:pointer;background:var(--cream);transition:all .2s;text-align:center}
.af-role-card:hover{border-color:var(--sage-l);background:#f0f6f2}
.af-role-card.sel{border-color:var(--sage);background:#e8f5ee}
.af-role-card .rc-ico{font-size:1.5rem}
.af-role-card .rc-nm{font-size:.8rem;font-weight:600;color:var(--txt)}
.af-role-card .rc-ds{font-size:.72rem;color:var(--light);line-height:1.4}
.af-divider{display:flex;align-items:center;gap:12px;margin:1.2rem 0;color:var(--light);font-size:.78rem}
.af-divider::before,.af-divider::after{content:'';flex:1;height:1px;background:var(--bdr)}
.af-check-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:1.2rem}
.af-check-row input[type=checkbox]{width:16px;height:16px;margin-top:2px;accent-color:var(--sage);flex-shrink:0;cursor:pointer}
.af-check-row label{font-size:.82rem;color:var(--mid);line-height:1.6;cursor:pointer}
.af-check-row a{color:var(--sage);text-decoration:none;font-weight:500}
.af-check-row a:hover{text-decoration:underline}
.af-submit{width:100%;padding:14px;background:var(--sage);color:#fff;border:none;border-radius:14px;font-size:.95rem;font-weight:700;font-family:'Outfit',sans-serif;cursor:pointer;transition:all .28s;display:flex;align-items:center;justify-content:center;gap:8px;position:relative;overflow:hidden}
.af-submit::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.12),transparent);pointer-events:none}
.af-submit:hover:not(:disabled){background:var(--sage-d);transform:translateY(-2px);box-shadow:0 8px 24px rgba(90,124,101,.4)}
.af-submit:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}
.af-bottom{margin-top:1.4rem;text-align:center;font-size:.84rem;color:var(--mid)}
.af-bottom a{color:var(--sage);font-weight:600;cursor:pointer;text-decoration:none}
.af-bottom a:hover{text-decoration:underline}
.auth-success{text-align:center;padding:2rem 0}
.as-circle{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#e8f5ee,#c8ebd8);display:flex;align-items:center;justify-content:center;font-size:2.2rem;margin:0 auto 1.5rem;box-shadow:0 8px 24px rgba(90,124,101,.2)}
.as-ttl{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:var(--sage-d);margin-bottom:.6rem}
.as-msg{font-size:.9rem;color:var(--mid);line-height:1.75;margin-bottom:1.8rem}
.as-info{background:var(--cream);border-radius:14px;padding:1.2rem 1.4rem;border:1px solid var(--bdr);margin-bottom:1.5rem;text-align:left}
.as-info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bdr);font-size:.86rem}
.as-info-row:last-child{border-bottom:none}
.as-info-row span:first-child{color:var(--light)}
.as-info-row span:last-child{font-weight:600;color:var(--txt)}
.af-alert{padding:11px 16px;border-radius:12px;font-size:.85rem;margin-bottom:1rem;display:flex;align-items:center;gap:10px}
.af-alert.error{background:#fef2f2;border:1px solid #fecaca;color:#c0392b}
.af-alert.info{background:#f0f6f2;border:1px solid #b8ddc8;color:var(--sage-d)}
.af-back{display:inline-flex;align-items:center;gap:7px;margin-bottom:2rem;font-size:.84rem;color:var(--mid);cursor:pointer;border:none;background:none;font-family:'Outfit',sans-serif;padding:0;transition:color .2s}
.af-back:hover{color:var(--sage-d)}

/* ADMIN */
.admin-layout{display:flex;min-height:100vh;background:#f3f5f9}
.admin-sidebar{width:260px;background:var(--sage-d);flex-shrink:0;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;overflow-y:auto}
.ab-box{padding:1.8rem 1.5rem 1.3rem;border-bottom:1px solid rgba(255,255,255,.1)}
.ab-nm{font-family:'Cormorant Garamond',serif;font-size:1.4rem;color:#fff;font-weight:700;display:flex;align-items:center;gap:10px}
.ab-mark{width:34px;height:34px;background:var(--sage);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px}
.ab-sub{font-size:.73rem;color:rgba(255,255,255,.4);margin-top:4px;padding-left:44px}
.sb-nav{padding:1rem .8rem;flex:1}
.sb-sec{font-size:.68rem;color:rgba(255,255,255,.28);letter-spacing:.12em;text-transform:uppercase;padding:.6rem .8rem .3rem}
.sb-it{display:flex;align-items:center;gap:11px;padding:10px 14px;border-radius:11px;cursor:pointer;color:rgba(255,255,255,.58);font-size:.88rem;font-weight:500;transition:all .2s;margin-bottom:2px}
.sb-it:hover{background:rgba(255,255,255,.08);color:#fff}
.sb-it.active{background:var(--sage);color:#fff}
.sb-ico{font-size:1rem;width:20px;text-align:center}
.sb-badge{margin-left:auto;background:var(--gold);color:#fff;font-size:.68rem;padding:2px 8px;border-radius:20px;font-weight:700}
.au-box{padding:1rem 1.5rem;border-top:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:10px}
.au-av{width:36px;height:36px;border-radius:50%;background:var(--sage);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.82rem;flex-shrink:0}
.au-nm{font-size:.87rem;color:#fff;font-weight:500}
.au-em{font-size:.73rem;color:rgba(255,255,255,.4)}
.admin-main{margin-left:260px;flex:1;display:flex;flex-direction:column;min-height:100vh}
.admin-topbar{background:#fff;padding:0 2rem;height:66px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8edf0;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.at-ttl{font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:var(--txt)}
.at-right{display:flex;align-items:center;gap:1rem}
.at-date{font-size:.82rem;color:var(--light)}
.at-btn{padding:8px 20px;background:var(--sage);color:#fff;border:none;border-radius:50px;font-size:.82rem;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .2s}
.at-btn:hover{background:var(--sage-d)}
.at-av{width:36px;height:36px;border-radius:50%;background:var(--sage);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;cursor:pointer}
.admin-content{padding:2rem;flex:1}
.mg{display:grid;grid-template-columns:repeat(4,1fr);gap:1.2rem;margin-bottom:2rem}
.mc{background:#fff;border-radius:18px;padding:1.5rem;border:1px solid #e8edf0}
.mc-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.8rem}
.mc-ico{font-size:1.6rem}
.mc-chg{font-size:.76rem;font-weight:700;padding:3px 9px;border-radius:20px}
.mc-chg.up{background:#e5f5ec;color:#1a7a42}
.mc-chg.dn{background:#fde8e8;color:#b81c1c}
.mc-val{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:var(--txt)}
.mc-lbl{font-size:.8rem;color:var(--light);margin-top:3px}
.ag2{display:grid;grid-template-columns:1.5fr 1fr;gap:1.2rem;margin-bottom:1.2rem}
.ac{background:#fff;border-radius:18px;padding:1.5rem;border:1px solid #e8edf0}
.ac-hd{font-weight:600;font-size:.93rem;color:var(--txt);margin-bottom:1.2rem;display:flex;justify-content:space-between;align-items:center}
.ac-hd span{font-size:.78rem;color:var(--sage);font-weight:500;cursor:pointer}
.bkt{width:100%;border-collapse:collapse}
.bkt th{font-size:.75rem;color:var(--light);font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:0 0 10px;border-bottom:1px solid #eee;text-align:left}
.bkt td{padding:11px 0;border-bottom:1px solid #f5f5f5;font-size:.86rem;color:var(--txt);vertical-align:middle}
.bkt tr:last-child td{border-bottom:none}
.st{padding:3px 10px;border-radius:20px;font-size:.73rem;font-weight:700}
.st.confirmed{background:#e5f5ec;color:#1a7a42}
.st.pending{background:#fff8e0;color:#9a7008}
.st.cancelled{background:#fde8e8;color:#b81c1c}
.st.completed{background:#e8f0fe;color:#1a56b0}
/* Status dropdown */
.status-select{appearance:none;-webkit-appearance:none;border:none;border-radius:20px;font-size:.73rem;font-weight:700;padding:4px 24px 4px 10px;cursor:pointer;outline:none;font-family:'Outfit',sans-serif;background-repeat:no-repeat;background-position:right 7px center;background-size:10px;transition:box-shadow .18s}
.status-select:hover{box-shadow:0 2px 8px rgba(0,0,0,.12)}
.status-select.confirmed{background-color:#e5f5ec;color:#1a7a42;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%231a7a42'/%3E%3C/svg%3E")}
.status-select.pending{background-color:#fff8e0;color:#9a7008;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239a7008'/%3E%3C/svg%3E")}
.status-select.cancelled{background-color:#fde8e8;color:#b81c1c;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23b81c1c'/%3E%3C/svg%3E")}
.status-select.completed{background-color:#e8f0fe;color:#1a56b0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%231a56b0'/%3E%3C/svg%3E")}

/* Delete confirm modal */
.del-modal-ov{position:fixed;inset:0;z-index:99000;background:rgba(15,20,15,.65);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeOv .2s ease}
.del-modal-box{background:#fff;border-radius:24px;width:100%;max-width:420px;padding:2rem;box-shadow:0 24px 80px rgba(0,0,0,.25);animation:mUp .3s cubic-bezier(.22,1,.36,1)}
.del-modal-icon{width:60px;height:60px;border-radius:18px;background:#fff5f5;display:flex;align-items:center;justify-content:center;font-size:1.6rem;margin:0 auto 1.2rem}
.del-modal-ttl{font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:700;color:var(--txt);text-align:center;margin-bottom:.5rem}
.del-modal-msg{font-size:.88rem;color:var(--mid);text-align:center;line-height:1.7;margin-bottom:1.6rem}
.del-modal-name{font-weight:700;color:#c53030}
.del-modal-acts{display:flex;gap:10px}
.del-cancel-btn{flex:1;padding:11px;border:1.5px solid var(--bdr);background:#fff;color:var(--mid);border-radius:14px;font-size:.88rem;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .18s}
.del-cancel-btn:hover{background:var(--cream);border-color:#ccc}
.del-confirm-btn{flex:1;padding:11px;border:none;background:#e53e3e;color:#fff;border-radius:14px;font-size:.88rem;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:6px}
.del-confirm-btn:hover{background:#c53030;transform:translateY(-1px);box-shadow:0 4px 14px rgba(229,62,62,.4)}
.del-confirm-btn:disabled{opacity:.6;transform:none;cursor:not-allowed}
/* Client row action btn */
.cl-del-btn{padding:5px 12px;background:#fff5f5;color:#c53030;border:1px solid #fca5a5;border-radius:10px;font-size:.75rem;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .18s;white-space:nowrap}
.cl-del-btn:hover{background:#fee2e2;border-color:#f87171;box-shadow:0 2px 8px rgba(220,38,38,.2)}
.cl-del-btn:disabled{opacity:.5;cursor:not-allowed}
.sr{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f5f5f5}
.sr:last-child{border-bottom:none}
.sr-ico{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
.sr-nm{font-size:.85rem;font-weight:500;flex:1}
.sr-pct{font-size:.82rem;font-weight:700;color:var(--sage)}
.cb-wrap{margin-top:.8rem}
.cb-bars{display:flex;align-items:flex-end;gap:5px;height:90px}
.cb{flex:1;border-radius:5px 5px 0 0;background:var(--sage);opacity:.65;transition:opacity .2s;cursor:pointer}
.cb:hover{opacity:1}
.cb-ls{display:flex;gap:5px;margin-top:5px}
.cb-l{flex:1;text-align:center;font-size:.65rem;color:var(--light)}
.cg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:1rem;margin-top:.5rem}
.cg-chip{display:flex;align-items:center;gap:10px;padding:11px 13px;background:#f7f9f7;border-radius:13px}
.cg-av{width:36px;height:36px;border-radius:50%;background:var(--sage);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0}
.cg-nm{font-weight:600;font-size:.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cg-role{font-size:.72rem;color:var(--light)}
.cg-st{font-size:.68rem;padding:2px 8px;border-radius:20px;font-weight:700}
.cg-st.on{background:#e5f5ec;color:#1a7a42}
.cg-st.brk{background:#fff8e0;color:#9a7008}
.cg-st.sc{background:#f0f6f2;color:var(--sage)}

@keyframes pageIn{from{opacity:0}to{opacity:1}}
.page{animation:pageIn .4s ease}

/* NOTIFICATION SYSTEM */
@keyframes notifSlideIn{from{opacity:0;transform:translateX(120%)}to{opacity:1;transform:translateX(0)}}
@keyframes notifFadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(120%)}}
@keyframes bellRing{0%,100%{transform:rotate(0)}15%{transform:rotate(18deg)}30%{transform:rotate(-14deg)}45%{transform:rotate(10deg)}60%{transform:rotate(-6deg)}75%{transform:rotate(4deg)}}
@keyframes pulseDot{0%,100%{transform:scale(1)}50%{transform:scale(1.35)}}

.notif-bell-wrap{position:relative;display:flex;align-items:center}
.notif-bell-btn{width:40px;height:40px;border-radius:12px;border:1px solid #e8edf0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:all .2s;position:relative;color:var(--mid)}
.notif-bell-btn:hover{background:var(--cream);border-color:var(--bdr);color:var(--sage-d)}
.notif-bell-btn.ringing{animation:bellRing .6s ease}
.notif-badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;border-radius:9px;background:#e53e3e;color:#fff;font-size:.66rem;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff;animation:pulseDot .8s ease 3}

.notif-panel{position:absolute;top:calc(100% + 12px);right:0;width:380px;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.14);border:1px solid #e8edf0;z-index:5000;overflow:hidden}
.notif-panel-hd{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.3rem;border-bottom:1px solid #f0f0f0}
.notif-panel-ttl{font-weight:700;font-size:.92rem;color:var(--txt);display:flex;align-items:center;gap:8px}
.notif-panel-ttl span{background:var(--sage);color:#fff;font-size:.68rem;padding:2px 7px;border-radius:20px;font-weight:700}
.notif-panel-acts{display:flex;gap:4px}
.notif-act-btn{padding:5px 10px;border:none;background:none;font-size:.76rem;color:var(--sage);font-weight:600;cursor:pointer;border-radius:8px;font-family:'Outfit',sans-serif;transition:background .15s}
.notif-act-btn:hover{background:var(--cream)}
.notif-tabs{display:flex;padding:.5rem .8rem;gap:4px;border-bottom:1px solid #f0f0f0}
.notif-tab{padding:5px 12px;border-radius:8px;border:none;background:none;font-size:.78rem;font-weight:600;color:var(--light);cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s}
.notif-tab.active{background:var(--cream);color:var(--sage-d)}
.notif-list{max-height:340px;overflow-y:auto;padding:.4rem 0}
.notif-empty{text-align:center;padding:2.5rem 1rem;color:var(--light);font-size:.86rem}
.notif-empty-ico{font-size:2.2rem;margin-bottom:.5rem}
.notif-item{display:flex;align-items:flex-start;gap:10px;padding:.85rem 1.1rem;cursor:pointer;border-bottom:1px solid #f8f8f8;transition:background .15s;position:relative}
.notif-item:last-child{border-bottom:none}
.notif-item:hover{background:#f9fbf9}
.notif-item.unread{background:#f5fbf7}
.notif-item.unread::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--sage);border-radius:0 2px 2px 0}
.notif-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
.notif-ico.booking{background:#e8f5ee}
.notif-ico.alert{background:#fff8e0}
.notif-ico.system{background:#f0f0f8}
.notif-body{flex:1;min-width:0}
.notif-title{font-size:.84rem;font-weight:600;color:var(--txt);margin-bottom:2px}
.notif-desc{font-size:.77rem;color:var(--mid);line-height:1.5}
.notif-time{font-size:.71rem;color:var(--light);margin-top:3px}
.notif-dismiss{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;border:none;background:none;color:var(--light);font-size:.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}
.notif-item:hover .notif-dismiss{opacity:1}
.notif-dismiss:hover{background:#f0f0f0;color:var(--txt)}
.notif-panel-ft{padding:.8rem 1.1rem;border-top:1px solid #f0f0f0;text-align:center}
.notif-panel-ft a{font-size:.8rem;color:var(--sage);font-weight:600;cursor:pointer}

.toast-stack{position:fixed;bottom:2rem;right:2rem;z-index:99999;display:flex;flex-direction:column;gap:.6rem;pointer-events:none}
.toast{display:flex;align-items:flex-start;gap:10px;padding:.85rem 1.1rem;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.14);border:1px solid #e8edf0;min-width:300px;max-width:360px;pointer-events:all;animation:notifSlideIn .4s cubic-bezier(.22,1,.36,1) both;position:relative;overflow:hidden}
.toast.exiting{animation:notifFadeOut .35s ease forwards}
.toast-ico{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;background:linear-gradient(135deg,#e0f7ea,#c8ebd8)}
.toast-body{flex:1}
.toast-ttl{font-size:.84rem;font-weight:700;color:var(--txt)}
.toast-msg{font-size:.77rem;color:var(--mid);line-height:1.5;margin-top:1px}
.toast-close{background:none;border:none;cursor:pointer;color:var(--light);font-size:.8rem;padding:0;flex-shrink:0;line-height:1}
.toast-close:hover{color:var(--txt)}
.toast-bar{position:absolute;bottom:0;left:0;height:3px;background:var(--sage);border-radius:0 0 0 16px;animation:toastProg 5s linear forwards}
@keyframes toastProg{from{width:100%}to{width:0%}}

/* SPECIALIST MODAL */
.sp-modal-ov{position:fixed;inset:0;z-index:9500;background:rgba(15,25,15,.72);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeOv .3s ease}
.sp-modal-box{background:#fff;border-radius:32px;width:100%;max-width:960px;max-height:94vh;overflow-y:auto;animation:mUp .42s cubic-bezier(.22,1,.36,1);box-shadow:0 40px 100px rgba(0,0,0,.30)}
.sp-modal-hd{position:sticky;top:0;background:#fff;z-index:10;padding:1.8rem 2.4rem 1.4rem;border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;border-radius:32px 32px 0 0}
.sp-hd-left{display:flex;align-items:center;gap:14px}
.sp-hd-icon{width:52px;height:52px;border-radius:16px;background:#f0f7f2;display:flex;align-items:center;justify-content:center;font-size:1.5rem}
.sp-hd-ttl{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:700;color:var(--txt)}
.sp-hd-sub{font-size:.83rem;color:var(--light);margin-top:2px}
.sp-modal-body{padding:2rem 2.4rem 2.4rem}
.sp-intro{font-size:.93rem;color:var(--mid);line-height:1.8;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--bdr)}
.sp-profiles-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.4rem}
.sp-profile-card{border-radius:24px;border:1.5px solid var(--bdr);overflow:hidden;transition:all .35s cubic-bezier(.22,1,.36,1);background:#fff;cursor:default}
.sp-profile-card:hover{transform:translateY(-6px);box-shadow:0 16px 48px rgba(90,124,101,.16);border-color:var(--sage-l)}
.sp-photo-wrap{position:relative;height:200px;overflow:hidden;background:#f0f7f2}
.sp-photo-wrap img{width:100%;height:100%;object-fit:cover;object-position:top center;transition:transform .5s ease}
.sp-profile-card:hover .sp-photo-wrap img{transform:scale(1.06)}
.sp-photo-badge{position:absolute;top:12px;right:12px;background:rgba(255,254,249,.95);border-radius:50px;padding:4px 10px;display:flex;align-items:center;gap:5px;font-size:.75rem;font-weight:700;color:var(--txt);box-shadow:0 4px 12px rgba(0,0,0,.1)}
.sp-photo-badge-star{color:#f4b942;font-size:.8rem}
.sp-profile-info{padding:1.3rem}
.sp-profile-name{font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:700;color:var(--txt);margin-bottom:2px}
.sp-profile-role{font-size:.78rem;color:var(--sage);font-weight:600;letter-spacing:.03em;margin-bottom:.9rem}
.sp-profile-bio{font-size:.82rem;color:var(--mid);line-height:1.72;margin-bottom:1rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.sp-tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:1rem}
.sp-tag{padding:3px 9px;background:#f0f7f2;border-radius:20px;font-size:.72rem;font-weight:600;color:var(--sage-d)}
.sp-profile-meta{display:flex;flex-direction:column;gap:5px;padding-top:.9rem;border-top:1px solid var(--bdr)}
.sp-meta-row{display:flex;align-items:center;gap:7px;font-size:.78rem;color:var(--mid)}
.sp-meta-row span:first-child{font-size:.9rem;width:18px;text-align:center}
.sp-meta-row strong{color:var(--txt);font-weight:600}
.sp-book-btn{width:100%;margin-top:1rem;padding:10px;background:var(--sage);color:#fff;border:none;border-radius:50px;font-size:.85rem;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .25s;display:flex;align-items:center;justify-content:center;gap:7px}
.sp-book-btn:hover{background:var(--sage-d);transform:translateY(-2px);box-shadow:0 6px 18px rgba(90,124,101,.35)}
.sp-no-specialists{text-align:center;padding:3rem;color:var(--light);font-size:.95rem}

/* SPECIALIST DETAIL PAGE */
@keyframes pageSlideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
.sdp{animation:pageSlideIn .45s cubic-bezier(.22,1,.36,1);min-height:100vh;background:var(--warm)}
.sdp-hero{position:relative;background:linear-gradient(135deg,var(--sage-d) 0%,#2a4a35 60%,#1a3025 100%);min-height:480px;display:flex;align-items:flex-end;overflow:hidden;padding-top:76px}
.sdp-hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='20'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
.sdp-hero-inner{position:relative;z-index:2;width:100%;max-width:1200px;margin:0 auto;padding:3rem 6rem 4rem;display:grid;grid-template-columns:280px 1fr;gap:4rem;align-items:flex-end}
.sdp-photo-col{position:relative;flex-shrink:0}
.sdp-photo{width:240px;height:280px;border-radius:24px;object-fit:cover;object-position:top center;border:4px solid rgba(255,255,255,.2);box-shadow:0 20px 60px rgba(0,0,0,.4);display:block}
.sdp-avail-badge{position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:var(--gold);color:#fff;border-radius:50px;padding:6px 18px;font-size:.76rem;font-weight:700;white-space:nowrap;box-shadow:0 4px 14px rgba(201,168,92,.5)}
.sdp-hero-info{padding-bottom:.5rem}
.sdp-back-btn{display:inline-flex;align-items:center;gap:8px;color:rgba(255,255,255,.6);font-size:.82rem;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Outfit',sans-serif;margin-bottom:1.2rem;padding:0;transition:color .2s}
.sdp-back-btn:hover{color:#fff}
.sdp-role-badge{display:inline-flex;align-items:center;gap:8px;padding:5px 14px;border-radius:50px;background:rgba(201,168,92,.2);border:1px solid rgba(201,168,92,.4);color:var(--gold-l);font-size:.76rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;margin-bottom:1rem}
.sdp-name{font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,4vw,3rem);font-weight:700;color:#fff;line-height:1.1;margin-bottom:.5rem}
.sdp-title{font-size:1rem;color:rgba(255,255,255,.65);margin-bottom:1.4rem}
.sdp-hero-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1.6rem}
.sdp-hero-tag{padding:4px 12px;background:rgba(255,255,255,.1);border-radius:20px;font-size:.78rem;color:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.15)}
.sdp-stats-row{display:flex;gap:2rem;flex-wrap:wrap}
.sdp-stat{text-align:center}
.sdp-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:700;color:var(--gold-l);display:block}
.sdp-stat-lbl{font-size:.72rem;color:rgba(255,255,255,.5);letter-spacing:.06em;margin-top:2px}
.sdp-body{max-width:1200px;margin:0 auto;padding:3.5rem 6rem;display:grid;grid-template-columns:1fr 360px;gap:3rem;align-items:start}
.sdp-main{}
.sdp-section{background:#fff;border-radius:24px;padding:2rem;border:1px solid var(--bdr);margin-bottom:1.5rem}
.sdp-section-ttl{font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:var(--txt);margin-bottom:1.2rem;display:flex;align-items:center;gap:10px}
.sdp-section-ttl::after{content:'';flex:1;height:1px;background:var(--bdr)}
.sdp-bio-para{font-size:.94rem;color:var(--mid);line-height:1.9;margin-bottom:1rem}
.sdp-bio-para:last-child{margin-bottom:0}
.sdp-video-wrap{border-radius:18px;overflow:hidden;position:relative;background:#000;aspect-ratio:16/9}
.sdp-video-wrap video{width:100%;height:100%;object-fit:cover;display:block}
.sdp-video-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25);transition:background .3s}
.sdp-video-overlay:hover{background:rgba(0,0,0,.1)}
.sdp-play-btn{width:68px;height:68px;border-radius:50%;background:rgba(255,255,255,.92);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.6rem;box-shadow:0 8px 32px rgba(0,0,0,.3);transition:transform .25s,box-shadow .25s}
.sdp-play-btn:hover{transform:scale(1.1);box-shadow:0 12px 40px rgba(0,0,0,.4)}
.sdp-video-playing .sdp-video-overlay{display:none}
.sdp-rating-summary{display:flex;align-items:center;gap:2rem;padding:1.5rem;background:var(--cream);border-radius:16px;margin-bottom:1.5rem}
.sdp-big-rating{text-align:center}
.sdp-big-num{font-family:'Cormorant Garamond',serif;font-size:3.5rem;font-weight:700;color:var(--txt);line-height:1}
.sdp-big-stars{color:#f4b942;font-size:1.1rem;letter-spacing:2px;margin:.3rem 0}
.sdp-big-count{font-size:.78rem;color:var(--light)}
.sdp-rating-bars{flex:1}
.sdp-rbar-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.sdp-rbar-lbl{font-size:.76rem;color:var(--mid);width:10px;text-align:right;font-weight:600}
.sdp-rbar-track{flex:1;height:7px;background:#e8e0d5;border-radius:4px;overflow:hidden}
.sdp-rbar-fill{height:100%;background:var(--gold);border-radius:4px}
.sdp-rbar-pct{font-size:.72rem;color:var(--light);width:28px}
.sdp-review-card{padding:1.3rem;border:1px solid var(--bdr);border-radius:16px;margin-bottom:.8rem;transition:box-shadow .2s}
.sdp-review-card:hover{box-shadow:var(--sh)}
.sdp-rev-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:.8rem}
.sdp-rev-auth{display:flex;align-items:center;gap:10px}
.sdp-rev-av{width:38px;height:38px;border-radius:50%;background:var(--sage);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0}
.sdp-rev-nm{font-weight:600;font-size:.88rem;color:var(--txt)}
.sdp-rev-date{font-size:.75rem;color:var(--light);margin-top:1px}
.sdp-rev-stars{color:#f4b942;font-size:.82rem;letter-spacing:1.5px}
.sdp-rev-txt{font-size:.86rem;color:var(--mid);line-height:1.8;font-style:italic}
.sdp-sidebar{}
.sdp-book-card{background:var(--sage-d);border-radius:24px;padding:2rem;margin-bottom:1.2rem;position:sticky;top:88px}
.sdp-book-card-ttl{font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:#fff;margin-bottom:.4rem}
.sdp-book-card-sub{font-size:.82rem;color:rgba(255,255,255,.55);margin-bottom:1.4rem}
.sdp-book-card-meta{display:flex;flex-direction:column;gap:.7rem;margin-bottom:1.4rem}
.sdp-bcm-row{display:flex;align-items:center;gap:10px;font-size:.83rem}
.sdp-bcm-row span:first-child{font-size:1rem;width:20px;text-align:center}
.sdp-bcm-lbl{color:rgba(255,255,255,.5);min-width:70px}
.sdp-bcm-val{color:#fff;font-weight:600}
.sdp-book-cta{width:100%;padding:13px;background:var(--gold);color:#fff;border:none;border-radius:14px;font-size:.95rem;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .25s;display:flex;align-items:center;justify-content:center;gap:8px}
.sdp-book-cta:hover{background:#b8923e;transform:translateY(-2px);box-shadow:0 8px 24px rgba(201,168,92,.5)}
.sdp-info-card{background:#fff;border-radius:24px;padding:1.8rem;border:1px solid var(--bdr)}
.sdp-info-card-ttl{font-size:.8rem;font-weight:700;color:var(--light);letter-spacing:.1em;text-transform:uppercase;margin-bottom:1rem}
.sdp-info-row{display:flex;gap:10px;padding:.7rem 0;border-bottom:1px solid var(--bdr);align-items:flex-start}
.sdp-info-row:last-child{border-bottom:none}
.sdp-info-icon{font-size:1rem;width:22px;text-align:center;flex-shrink:0;margin-top:1px}
.sdp-info-body{}
.sdp-info-key{font-size:.74rem;color:var(--light);font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:2px}
.sdp-info-val{font-size:.86rem;color:var(--txt);font-weight:500;line-height:1.5}
/* Make specialist profile cards clickable */
.sp-profile-card{cursor:pointer}
.sp-view-profile{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:.8rem;padding:8px;background:var(--cream);border:1px solid var(--bdr);border-radius:50px;font-size:.8rem;font-weight:600;color:var(--mid);transition:all .2s}
.sp-profile-card:hover .sp-view-profile{background:var(--sage);border-color:var(--sage);color:#fff}
@media(max-width:900px){
  .sdp-hero-inner{grid-template-columns:1fr;padding:2rem;gap:1.5rem}
  .sdp-photo{width:160px;height:190px}
  .sdp-body{grid-template-columns:1fr;padding:2rem}
  .sdp-book-card{position:static}
}
.svc-card{cursor:pointer}
.svc-card-cta{display:flex;align-items:center;gap:6px;margin-top:1.2rem;font-size:.82rem;font-weight:600;color:var(--sage);transition:gap .2s}
.svc-card:hover .svc-card-cta{gap:10px}

@media(max-width:900px){
  .why-split,.about-split,.contact-split{grid-template-columns:1fr}
  .testi-grid,.mg{grid-template-columns:1fr 1fr}
  .ag2{grid-template-columns:1fr}
  .section{padding:4rem 2rem}
  .stats-bar{padding:2rem;gap:2rem;flex-wrap:wrap}
  .navbar{padding:0 1.5rem}
  .nav-links{display:none}
  .vslide-content{padding:0 2rem}
  .footer-top{grid-template-columns:1fr 1fr}
  .svc-tiles,.time-slots{grid-template-columns:1fr 1fr}
  .mf-row{grid-template-columns:1fr}
  .cta-banner{padding:3rem 2rem}
  .sp-profiles-grid{grid-template-columns:1fr}
  .sp-modal-box{border-radius:20px}
  .sp-modal-hd,.sp-modal-body{padding-left:1.4rem;padding-right:1.4rem}
}
`;

/* ─── SPECIALIST DETAIL PAGE ─── */
function SpecialistDetailPage({ specialist, onBack, onBook }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const reviews = SPECIALIST_REVIEWS[specialist.name] || [];

  // Rating bar distribution (mock)
  const barData = [
    { stars: 5, pct: Math.round(specialist.rating * 18) },
    { stars: 4, pct: Math.round((5.05 - specialist.rating) * 22) },
    { stars: 3, pct: 5 },
    { stars: 2, pct: 2 },
    { stars: 1, pct: 1 },
  ];
  const total = barData.reduce((a, b) => a + b.pct, 0);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const bioParas = specialist.fullBio.split("\n\n");

  return (
    <div className="sdp page">
      {/* HERO */}
      <div className="sdp-hero">
        <div className="sdp-hero-inner">
          <div className="sdp-photo-col">
            <img className="sdp-photo" src={specialist.photo} alt={specialist.name}/>
            <div className="sdp-avail-badge">📅 {specialist.avail}</div>
          </div>
          <div className="sdp-hero-info">
            <button className="sdp-back-btn" onClick={onBack}>← Back to Specialists</button>
            <div className="sdp-role-badge">{specialist.cert}</div>
            <div className="sdp-name">{specialist.name}</div>
            <div className="sdp-title">{specialist.role} · {specialist.exp} experience</div>
            <div className="sdp-hero-tags">
              {specialist.tags.map(t=><span className="sdp-hero-tag" key={t}>{t}</span>)}
            </div>
            <div className="sdp-stats-row">
              {specialist.stats.map(([val,lbl])=>(
                <div className="sdp-stat" key={lbl}>
                  <span className="sdp-stat-val">{val}</span>
                  <span className="sdp-stat-lbl">{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="sdp-body">
        <div className="sdp-main">
          {/* About */}
          <div className="sdp-section">
            <div className="sdp-section-ttl">About {specialist.name.split(" ")[0]}</div>
            {bioParas.map((p,i)=><p className="sdp-bio-para" key={i}>{p}</p>)}
          </div>

          {/* Intro Video */}
          <div className="sdp-section">
            <div className="sdp-section-ttl">Introduction Video</div>
            <div className={`sdp-video-wrap${playing?" sdp-video-playing":""}`}>
              <video
                ref={videoRef}
                src={specialist.video}
                loop
                playsInline
                onEnded={()=>setPlaying(false)}
                style={{display:"block"}}
              />
              <div className="sdp-video-overlay" onClick={togglePlay}>
                <button className="sdp-play-btn">{playing?"⏸":"▶"}</button>
              </div>
            </div>
            <p style={{fontSize:".8rem",color:"var(--light)",marginTop:".8rem",textAlign:"center"}}>Click to play — {specialist.name}'s introduction and care philosophy</p>
          </div>

          {/* Ratings & Reviews */}
          <div className="sdp-section">
            <div className="sdp-section-ttl">Ratings & Reviews</div>
            <div className="sdp-rating-summary">
              <div className="sdp-big-rating">
                <div className="sdp-big-num">{specialist.rating}</div>
                <div className="sdp-big-stars">{"★".repeat(Math.round(specialist.rating))}{"☆".repeat(5-Math.round(specialist.rating))}</div>
                <div className="sdp-big-count">{specialist.reviews} reviews</div>
              </div>
              <div className="sdp-rating-bars">
                {barData.map(({stars,pct})=>(
                  <div className="sdp-rbar-row" key={stars}>
                    <span className="sdp-rbar-lbl">{stars}</span>
                    <span style={{fontSize:".7rem",color:"#f4b942"}}>★</span>
                    <div className="sdp-rbar-track">
                      <div className="sdp-rbar-fill" style={{width:`${Math.min(100,Math.round(pct/total*100))}%`}}/>
                    </div>
                    <span className="sdp-rbar-pct">{Math.round(pct/total*100)}%</span>
                  </div>
                ))}
              </div>
            </div>
            {reviews.map((r,i)=>(
              <div className="sdp-review-card" key={i}>
                <div className="sdp-rev-hd">
                  <div className="sdp-rev-auth">
                    <div className="sdp-rev-av">{r.initials}</div>
                    <div><div className="sdp-rev-nm">{r.name}</div><div className="sdp-rev-date">{r.date}</div></div>
                  </div>
                  <div className="sdp-rev-stars">{"★".repeat(r.rating)}</div>
                </div>
                <p className="sdp-rev-txt">"{r.text}"</p>
              </div>
            ))}
            {reviews.length===0&&<p style={{color:"var(--light)",fontSize:".9rem",textAlign:"center",padding:"1rem"}}>No reviews yet — be the first!</p>}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="sdp-sidebar">
          <div className="sdp-book-card">
            <div className="sdp-book-card-ttl">Book {specialist.name.split(" ")[0]}</div>
            <div className="sdp-book-card-sub">Free consultation — no payment required today</div>
            <div className="sdp-book-card-meta">
              <div className="sdp-bcm-row"><span>⭐</span><span className="sdp-bcm-lbl">Rating</span><span className="sdp-bcm-val">{specialist.rating} / 5.0</span></div>
              <div className="sdp-bcm-row"><span>📅</span><span className="sdp-bcm-lbl">Available</span><span className="sdp-bcm-val">{specialist.avail}</span></div>
              <div className="sdp-bcm-row"><span>⏳</span><span className="sdp-bcm-lbl">Experience</span><span className="sdp-bcm-val">{specialist.exp}</span></div>
              <div className="sdp-bcm-row"><span>🗣️</span><span className="sdp-bcm-lbl">Languages</span><span className="sdp-bcm-val">{specialist.lang.join(", ")}</span></div>
            </div>
            <button className="sdp-book-cta" onClick={()=>onBook(specialist)}>📅 Book an Appointment</button>
          </div>
          <div className="sdp-info-card">
            <div className="sdp-info-card-ttl">Credentials & Info</div>
            <div className="sdp-info-row"><span className="sdp-info-icon">🎓</span><div className="sdp-info-body"><div className="sdp-info-key">Certification</div><div className="sdp-info-val">{specialist.cert}</div></div></div>
            <div className="sdp-info-row"><span className="sdp-info-icon">🏫</span><div className="sdp-info-body"><div className="sdp-info-key">Education</div><div className="sdp-info-val">{specialist.education}</div></div></div>
            <div className="sdp-info-row"><span className="sdp-info-icon">💬</span><div className="sdp-info-body"><div className="sdp-info-key">Languages</div><div className="sdp-info-val">{specialist.lang.join(" · ")}</div></div></div>
            <div className="sdp-info-row"><span className="sdp-info-icon">📅</span><div className="sdp-info-body"><div className="sdp-info-key">Availability</div><div className="sdp-info-val">{specialist.avail}</div></div></div>
            <div className="sdp-info-row"><span className="sdp-info-icon">✅</span><div className="sdp-info-body"><div className="sdp-info-key">Background Check</div><div className="sdp-info-val">Verified & Cleared</div></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SPECIALIST MODAL ─── */
function SpecialistModal({ service, onClose, onBook, onViewProfile, physiotherapists = [] }) {
  // Merge static specialists with Firebase physiotherapists for Physical Therapy
  const staticSpecialists = SPECIALISTS[service.name] || [];
  const firebasePhysios = service.name === "Physical Therapy"
    ? physiotherapists.map(p => ({
        name: p.name,
        role: p.role || "Physiotherapist",
        exp: p.exp || "N/A",
        rating: parseFloat(p.rating) || 5.0,
        reviews: parseInt(p.reviews) || 0,
        photo: p.photo || "https://images.pexels.com/photos/5473182/pexels-photo-5473182.jpeg?auto=compress&cs=tinysrgb&w=600",
        tags: p.tags ? (Array.isArray(p.tags) ? p.tags : p.tags.split(",").map(t=>t.trim())) : [],
        bio: p.bio || "",
        fullBio: p.fullBio || p.bio || "",
        avail: p.avail || "Mon – Fri",
        lang: p.lang ? (Array.isArray(p.lang) ? p.lang : p.lang.split(",").map(l=>l.trim())) : ["English"],
        cert: p.cert || "",
        education: p.education || "",
        video: p.video || "https://videos.pexels.com/video-files/3196716/3196716-uhd_2560_1440_25fps.mp4",
        stats: p.stats || [[p.reviews||"0","Reviews"],[p.exp||"N/A","Experience"],[(p.rating||"5.0")+"★","Rating"]],
        _isFirebase: true,
      }))
    : [];
  const specialists = [...staticSpecialists, ...firebasePhysios];
  const svcIcon = service.icon;
  return (
    <div className="sp-modal-ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sp-modal-box">
        <div className="sp-modal-hd">
          <div className="sp-hd-left">
            <div className="sp-hd-icon">{svcIcon}</div>
            <div>
              <div className="sp-hd-ttl">{service.name}</div>
              <div className="sp-hd-sub">{specialists.length} specialist{specialists.length!==1?"s":""} available{service.name==="Physical Therapy"&&firebasePhysios.length>0?` · ${firebasePhysios.length} added by admin`:""}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sp-modal-body">
          <p className="sp-intro">{service.desc} — Meet our dedicated team of professionals. Click a profile to learn more.</p>
          {specialists.length===0
            ? <div className="sp-no-specialists">No specialists listed yet. Please contact us for availability.</div>
            : <div className="sp-profiles-grid">
                {specialists.map(sp=>(
                  <div className="sp-profile-card" key={sp.name + (sp._isFirebase?"_fb":"")} onClick={()=>{onClose();onViewProfile(sp);}}>
                    <div className="sp-photo-wrap">
                      <img src={sp.photo} alt={sp.name} loading="lazy"/>
                      <div className="sp-photo-badge">
                        <span className="sp-photo-badge-star">★</span>
                        <span>{sp.rating}</span>
                        <span style={{color:"#aaa",fontWeight:400}}>({sp.reviews})</span>
                      </div>
                      {sp._isFirebase && (
                        <div style={{position:"absolute",bottom:10,left:10,background:"#5a7c65",color:"#fff",fontSize:".65rem",fontWeight:700,padding:"2px 8px",borderRadius:20,letterSpacing:".04em"}}>
                          🔥 New
                        </div>
                      )}
                    </div>
                    <div className="sp-profile-info">
                      <div className="sp-profile-name">{sp.name}</div>
                      <div className="sp-profile-role">{sp.role}</div>
                      <div className="sp-profile-bio">{sp.bio}</div>
                      <div className="sp-tags">
                        {sp.tags.map(t=><span className="sp-tag" key={t}>{t}</span>)}
                      </div>
                      <div className="sp-profile-meta">
                        <div className="sp-meta-row"><span>🎓</span><span>{sp.cert}</span></div>
                        <div className="sp-meta-row"><span>⏳</span><strong>{sp.exp}</strong><span>experience</span></div>
                        <div className="sp-meta-row"><span>📅</span><strong>{sp.avail}</strong></div>
                        <div className="sp-meta-row"><span>🗣️</span><span>{sp.lang.join(", ")}</span></div>
                      </div>
                      <div className="sp-view-profile">View Full Profile →</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}

/* ─── BOOKING MODAL ─── */
function BookingModal({ onClose, onBooked, specialist }) {
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState({
    svc: specialist?.role ? (
      Object.keys(SPECIALISTS).find(cat =>
        SPECIALISTS[cat].some(s => s.name === specialist.name)
      ) || "Physical Therapy"
    ) : "",
    time: "",
    freq: "",
  });
  const [form, setForm] = useState({ fn:"", ln:"", email:"", phone:"", careFor:"myself", date:"", notes:"" });
  const ref = "#CN" + Math.floor(10000 + Math.random() * 90000);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const valid = () => {
    if(step===1) return form.fn && form.ln && form.email && form.phone;
    if(step===2) return sel.svc;
    if(step===3) return form.date && sel.time;
    return true;
  };

  const steps = ["Your Info","Service","Date & Time","Confirm"];

  // Build WhatsApp link for the success screen
  const buildWALink = () => {
    const priceInfo = specialist?.pricePerSession
      ? `\n💰 Price per session: PKR ${Number(specialist.pricePerSession).toLocaleString()}`
      : "";
    const therapistInfo = specialist
      ? `\n🏃 Physiotherapist: ${specialist.name}` : "";
    const msg = encodeURIComponent(
      `✅ *CareNest Booking Confirmed!*\n\nHi ${form.fn}, your appointment is booked.\n\n` +
      `📋 *Ref:* ${ref}\n🏥 *Service:* ${sel.svc}` +
      therapistInfo + priceInfo + `\n` +
      `📅 *Date:* ${form.date ? new Date(form.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) : "TBD"}\n` +
      `⏰ *Time:* ${sel.time||"TBD"}\n\nOur coordinator will call you within 2 hours. Thank you! 🏡`
    );
    const cleanPhone = form.phone.replace(/[\s\-\(\)]/g,"");
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  const buildMailtoLink = () => {
    const subject = encodeURIComponent(`CareNest Booking Confirmation — ${ref}`);
    const priceInfo = specialist?.pricePerSession
      ? `\nPrice per session: PKR ${Number(specialist.pricePerSession).toLocaleString()}` : "";
    const therapistInfo = specialist ? `\nPhysiotherapist: ${specialist.name}` : "";
    const body = encodeURIComponent(
      `Dear ${form.fn} ${form.ln},\n\nYour CareNest appointment has been confirmed!\n\n` +
      `Booking Reference: ${ref}\nService: ${sel.svc}` +
      therapistInfo + priceInfo + `\n` +
      `Date: ${form.date ? new Date(form.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) : "TBD"}\n` +
      `Time: ${sel.time||"TBD"}\nCare for: ${form.careFor}\n\n` +
      `Our coordinator will contact you at ${form.phone} within 2 hours.\n\nWarm regards,\nCareNest Team`
    );
    return `mailto:${form.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div className="modal-hd">
          <div>
            <div className="modal-ttl">{step===5?"Booking Confirmed!":step===4?"Review & Confirm":"Book an Appointment"}</div>
            <div className="modal-sub">{step<5?`Step ${step} of 4 — ${steps[step-1]}`:"We'll contact you shortly"}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Specialist banner — shown when booked via a profile */}
        {specialist && step < 5 && (
          <div style={{margin:"0 1.5rem",padding:"10px 14px",background:"linear-gradient(135deg,#e8f5ee,#f0faf3)",border:"1.5px solid #a8d5b5",borderRadius:14,display:"flex",alignItems:"center",gap:12}}>
            {specialist.photo && <img src={specialist.photo} alt={specialist.name} style={{width:46,height:46,borderRadius:10,objectFit:"cover",border:"2px solid #c8ebd8",flexShrink:0}}/>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:".88rem",color:"#1a5c30"}}>{specialist.name}</div>
              <div style={{fontSize:".78rem",color:"#2a7a45",marginTop:1}}>{specialist.role}</div>
            </div>
            {specialist.pricePerSession && (
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:".72rem",color:"#2a7a45",fontWeight:600}}>Per Session</div>
                <div style={{fontSize:"1rem",fontWeight:800,color:"#1a5c30"}}>PKR {Number(specialist.pricePerSession).toLocaleString()}</div>
              </div>
            )}
          </div>
        )}

        <div className="modal-body">
          {step<=4&&(
            <div className="modal-steps">
              {steps.map((s,i)=>(
                <div key={s} style={{display:"flex",alignItems:"center",flex:1}}>
                  <div className={`m-step ${i+1===step?"active":i+1<step?"done":""}`}>
                    <div className="m-step-circle">{i+1<step?"✓":i+1}</div>
                  </div>
                  {i<3&&<div className={`m-step-line ${i+1<step?"done":""}`}/>}
                </div>
              ))}
            </div>
          )}

          {step===1&&<>
            <div className="mf-row">
              <div className="mf-g"><label className="mf-l">First Name *</label><input className="mf-i" placeholder="Jane" value={form.fn} onChange={e=>set("fn",e.target.value)}/></div>
              <div className="mf-g"><label className="mf-l">Last Name *</label><input className="mf-i" placeholder="Doe" value={form.ln} onChange={e=>set("ln",e.target.value)}/></div>
            </div>
            <div className="mf-g"><label className="mf-l">Email *</label><input className="mf-i" type="email" placeholder="jane@example.com" value={form.email} onChange={e=>set("email",e.target.value)}/></div>
            <div className="mf-g"><label className="mf-l">Phone / WhatsApp *</label><input className="mf-i" type="tel" placeholder="+92 300 0000000" value={form.phone} onChange={e=>set("phone",e.target.value)}/></div>
            <div className="mf-g">
              <label className="mf-l">Care is for</label>
              <select className="mf-i" value={form.careFor} onChange={e=>set("careFor",e.target.value)}>
                <option value="myself">Myself</option>
                <option value="parent">A Parent</option>
                <option value="spouse">A Spouse / Partner</option>
                <option value="child">A Child</option>
                <option value="other">Someone Else</option>
              </select>
            </div>
          </>}

          {step===2&&<>
            <p style={{fontSize:".88rem",color:"var(--mid)",marginBottom:"1.2rem",lineHeight:1.65}}>Select the care service you need. Our coordinator will match you with the ideal caregiver.</p>
            <div className="svc-tiles">
              {SERVICES.slice(0,8).map(s=>(
                <div key={s.name} className={`svc-tile${sel.svc===s.name?" sel":""}`} onClick={()=>setSel(x=>({...x,svc:s.name}))}>
                  <span style={{fontSize:"1.3rem"}}>{s.icon}</span>
                  <span style={{fontSize:".85rem",fontWeight:500,color:"var(--txt)"}}>{s.name}</span>
                </div>
              ))}
            </div>
            <div className="mf-g">
              <label className="mf-l">Additional notes</label>
              <textarea className="mf-i" style={{minHeight:75,resize:"vertical"}} placeholder="E.g. hours needed, specific requirements..." value={form.notes} onChange={e=>set("notes",e.target.value)}/>
            </div>
          </>}

          {step===3&&<>
            <div className="mf-g">
              <label className="mf-l">Preferred Start Date *</label>
              <input className="mf-i" type="date" min={new Date().toISOString().split("T")[0]} value={form.date} onChange={e=>set("date",e.target.value)}/>
            </div>
            <div className="mf-g">
              <label className="mf-l">Preferred Time *</label>
              <div className="time-slots">
                {TIME_SLOTS.map((t,i)=>(
                  <div key={t} className={`t-slot${UNAVAIL.includes(i)?" na":""}${sel.time===t?" sel":""}`} onClick={()=>!UNAVAIL.includes(i)&&setSel(x=>({...x,time:t}))}>
                    {UNAVAIL.includes(i)?<s style={{opacity:.4}}>{t}</s>:t}
                  </div>
                ))}
              </div>
              <p style={{fontSize:".75rem",color:"var(--light)",marginTop:4}}>Greyed-out slots are unavailable</p>
            </div>
            <div className="mf-g">
              <label className="mf-l">Care Frequency</label>
              <select className="mf-i" value={sel.freq} onChange={e=>setSel(x=>({...x,freq:e.target.value}))}>
                <option value="">Select frequency...</option>
                <option value="once">One-time visit</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays (Mon–Fri)</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom schedule</option>
              </select>
            </div>
          </>}

          {step===4&&<>
            <div style={{background:"var(--cream)",borderRadius:18,padding:"1.5rem",marginBottom:"1.2rem",border:"1px solid var(--bdr)"}}>
              <div style={{fontSize:".78rem",color:"var(--light)",marginBottom:12,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>Appointment Summary</div>
              {[
                ["👤 Name",`${form.fn} ${form.ln}`],
                ["📧 Email",form.email],
                ["📞 Phone / WhatsApp",form.phone],
                ["🏥 Service",sel.svc],
                ...(specialist ? [["🏃 Physiotherapist", specialist.name]] : []),
                ...(specialist?.pricePerSession ? [["💰 Price per Session", `PKR ${Number(specialist.pricePerSession).toLocaleString()}`]] : []),
                ["📅 Date",form.date?new Date(form.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}):"—"],
                ["⏰ Time",sel.time||"—"],
                ["🔄 Care for",form.careFor],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--bdr)",fontSize:".88rem"}}>
                  <span style={{color:"var(--mid)"}}>{k}</span>
                  <span style={{fontWeight:600,color:"var(--txt)"}}>{v}</span>
                </div>
              ))}
              {form.notes&&<div style={{marginTop:10,fontSize:".86rem",color:"var(--mid)",paddingTop:6}}>📝 {form.notes}</div>}
            </div>
            <p style={{fontSize:".85rem",color:"var(--mid)",lineHeight:1.7}}>By confirming, our care coordinator will contact you within <strong>2 hours</strong> to finalize your plan. A <strong>WhatsApp confirmation</strong> and <strong>email</strong> will be sent automatically.</p>
          </>}

          {step===5&&(
            <div className="booking-success">
              <div className="suc-circle">✅</div>
              <div className="suc-ttl">Appointment Booked!</div>
              <p className="suc-msg">Thank you, <strong>{form.fn}</strong>! Your request has been received.<br/>Our coordinator will call you at <strong>{form.phone}</strong> within 2 hours.</p>
              {specialist && (
                <div style={{background:"#f0faf3",border:"1.5px solid #a8d5b5",borderRadius:12,padding:"10px 16px",marginBottom:"1rem",fontSize:".85rem",color:"#1a5c30",textAlign:"left"}}>
                  <strong>🏃 {specialist.name}</strong>{specialist.pricePerSession ? ` · PKR ${Number(specialist.pricePerSession).toLocaleString()}/session` : ""}
                </div>
              )}
              <div className="bk-ref">Reference: <strong>{ref}</strong></div>
              <div style={{display:"flex",gap:10,marginTop:"1.2rem",flexWrap:"wrap",justifyContent:"center"}}>
                <a href={buildWALink()} target="_blank" rel="noreferrer"
                  style={{display:"flex",alignItems:"center",gap:7,padding:"10px 20px",background:"#25D366",color:"#fff",borderRadius:50,fontWeight:700,fontSize:".88rem",textDecoration:"none",boxShadow:"0 4px 14px rgba(37,211,102,.4)"}}>
                  💬 Open WhatsApp
                </a>
                <a href={buildMailtoLink()}
                  style={{display:"flex",alignItems:"center",gap:7,padding:"10px 20px",background:"var(--sage)",color:"#fff",borderRadius:50,fontWeight:700,fontSize:".88rem",textDecoration:"none",boxShadow:"0 4px 14px rgba(90,124,101,.35)"}}>
                  📧 Send Email
                </a>
              </div>
              <button className="btn-mn" style={{marginTop:"1rem",width:"100%"}} onClick={onClose}>Close →</button>
            </div>
          )}

          {step<=4&&(
            <div className="modal-ft">
              <button className="btn-mb" onClick={()=>step>1?setStep(s=>s-1):onClose()}>{step===1?"Cancel":"← Back"}</button>
              <button className="btn-mn" disabled={!valid()} onClick={()=>{
                if(step===4 && onBooked) onBooked({
                  name:`${form.fn} ${form.ln}`,
                  service: sel.svc,
                  time: sel.time,
                  date: form.date,
                  phone: form.phone,
                  email: form.email,
                  ref,
                  careFor: form.careFor,
                  physiotherapist: specialist?.name || null,
                  pricePerSession: specialist?.pricePerSession || null,
                });
                setStep(s=>s+1);
              }}>{step===4?"Confirm Booking ✓":"Continue →"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── VIDEO SLIDER ─── */
function VideoSlider({ onBook }) {
  const [cur, setCur] = useState(0);
  const [barKey, setBarKey] = useState(0);
  const refs = useRef([]);

  const go = idx => {
    refs.current.forEach((v,i)=>{ if(v){if(i===idx){v.currentTime=0;v.play().catch(()=>{})}else v.pause()} });
    setCur(idx); setBarKey(k=>k+1);
  };

  useEffect(()=>{ const t=setInterval(()=>go((cur+1)%VIDEOS.length),6000); return()=>clearInterval(t); },[cur]);
  useEffect(()=>{ refs.current.forEach((v,i)=>{ if(v){if(i===0)v.play().catch(()=>{});else v.pause()} }); },[]);

  return (
    <div className="vslider" id="home">
      {VIDEOS.map((s,i)=>(
        <div key={i} className={`vslide${i===cur?" active":""}`}>
          <video ref={el=>refs.current[i]=el} src={s.src} muted loop playsInline preload="auto"/>
          <div className="vslide-ov"/>
          <div className="vslide-content">
            <div className="vsc-badge">{s.badge}</div>
            <h1 className="vsc-title" dangerouslySetInnerHTML={{__html:s.title.replace(/\n/g,"<br/>")}}/>
            <p className="vsc-desc">{s.desc}</p>
            <div className="vsc-acts">
              <button className="btn-cta" onClick={onBook}>📅 Book Appointment</button>
              <button className="btn-ghost" onClick={()=>document.getElementById("services")?.scrollIntoView({behavior:"smooth"})}>Our Services →</button>
            </div>
          </div>
        </div>
      ))}
      <div className="vs-prog"><div key={barKey} className="vs-prog-bar"/></div>
      <div className="vs-dots">{VIDEOS.map((_,i)=><button key={i} className={`vs-dot${i===cur?" active":""}`} onClick={()=>go(i)}/>)}</div>
      <div className="vs-num"><strong>0{cur+1}</strong> / 0{VIDEOS.length}</div>
      <div className="vs-arrows">
        <button className="vs-arr" onClick={()=>go((cur-1+VIDEOS.length)%VIDEOS.length)}>↑</button>
        <button className="vs-arr" onClick={()=>go((cur+1)%VIDEOS.length)}>↓</button>
      </div>
      <div className="vs-scroll"><div className="vs-scroll-line"/><span className="vs-scroll-txt">Scroll</span></div>
    </div>
  );
}

/* ─── NAVBAR ─── */
function Navbar({ page, setPage, scrolled, onBook }) {
  const isAdmin = page==="admin";
  return (
    <nav className={`navbar${scrolled?" scrolled":""}${isAdmin?" dark":""}`}>
      <div className="nav-logo" onClick={()=>setPage("home")}>
        <div className="nav-logo-mark">🏡</div>
        <span className="nav-logo-name">CareNest</span>
      </div>
      {!isAdmin&&(
        <ul className="nav-links">
          <li className="nav-li"><a onClick={()=>{setPage("home");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>Home</a></li>
          <li className="nav-li">
            <a onClick={()=>document.getElementById("services")?.scrollIntoView({behavior:"smooth"})}>Services ▾</a>
            <div className="nav-drop">
              {SERVICES.slice(0,6).map(s=>(
                <div key={s.name} className="drop-item" onClick={()=>document.getElementById("services")?.scrollIntoView({behavior:"smooth"})}>
                  <span style={{fontSize:"1.1rem",width:26,textAlign:"center"}}>{s.icon}</span>
                  <span>{s.name}</span>
                </div>
              ))}
              <div className="drop-divider"/>
              <div className="drop-item" onClick={()=>document.getElementById("services")?.scrollIntoView({behavior:"smooth"})}>
                <span style={{fontSize:"1.1rem",width:26,textAlign:"center"}}>📋</span>
                <span>View All Services</span>
              </div>
            </div>
          </li>
          <li className="nav-li"><a onClick={()=>document.getElementById("about")?.scrollIntoView({behavior:"smooth"})}>About</a></li>
          <li className="nav-li"><a onClick={()=>document.getElementById("contact")?.scrollIntoView({behavior:"smooth"})}>Contact Us</a></li>
        </ul>
      )}
      <div className="nav-right">
        {isAdmin
          ?<button className="btn-admin-nav" onClick={()=>setPage("home")}>← Back to Website</button>
          :<>
            <button className="btn-admin-nav" onClick={()=>setPage("admin")}>Admin</button>
            <button className="btn-book-nav" onClick={onBook}>📅 Book Appointment</button>
          </>
        }
      </div>
    </nav>
  );
}

/* ─── HOME PAGE ─── */
function HomePage({ onBook, physiotherapists = [] }) {
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);

  if (selectedSpecialist) {
    return (
      <SpecialistDetailPage
        specialist={selectedSpecialist}
        onBack={()=>setSelectedSpecialist(null)}
        onBook={(sp)=>onBook(sp)}
      />
    );
  }

  return (
    <div className="page">
      <VideoSlider onBook={onBook}/>
      <div className="stats-bar">
        {[["500+","Families Served"],["15+","Years of Care"],["98%","Satisfaction Rate"],["24/7","Availability"]].map(([n,l])=>(
          <div className="stat-item" key={l}><div className="stat-val">{n}</div><div className="stat-lbl">{l}</div></div>
        ))}
      </div>
      <section className="section" id="services">
        <div className="container">
          <div className="eyebrow">What We Offer</div>
          <h2 className="sec-h">Comprehensive Home Care Services</h2>
          <p className="sec-sub">Everything your loved one needs to live comfortably at home — click any service to meet our specialists.</p>
          <div className="svc-grid">
            {SERVICES.map(s=>(
              <div className="svc-card" key={s.name} onClick={()=>setSelectedService(s)}>
                <div className="svc-icon">{s.icon}</div>
                <div className="svc-nm">{s.name}</div>
                <div className="svc-ds">{s.desc}</div>
                <div className="svc-card-cta">Meet our specialists →</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {selectedService&&(
        <SpecialistModal
          service={selectedService}
          onClose={()=>setSelectedService(null)}
          onBook={onBook}
          onViewProfile={sp=>{setSelectedService(null);setSelectedSpecialist(sp);window.scrollTo(0,0);}}
          physiotherapists={physiotherapists}
        />
      )}
      <section className="section section-alt">
        <div className="container">
          <div className="why-split">
            <div className="why-vis">
              <div className="why-vis-em">🌿</div>
              <div className="why-award">
                <div className="why-award-bdg">⭐</div>
                <div className="why-award-txt"><strong>Top Rated Agency</strong><span>Rated #1 in Home Care 2024</span></div>
              </div>
            </div>
            <div>
              <div className="eyebrow">Why Choose Us</div>
              <h2 className="sec-h">Quality Care You Can Trust Every Day</h2>
              <p className="sec-sub">We go beyond standard care to deliver an experience rooted in trust, dignity, and genuine compassion.</p>
              <div className="why-feats">
                {FEATURES.map(f=>(
                  <div className="why-feat" key={f.title}>
                    <div className="wf-icon">{f.icon}</div>
                    <div><div className="wf-ttl">{f.title}</div><div className="wf-ds">{f.desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section" id="about">
        <div className="container">
          <div className="about-split">
            <div>
              <div className="eyebrow">About CareNest</div>
              <h2 className="sec-h">Built on a Foundation of Compassion</h2>
              <div className="about-prose">
                <p>Founded in 2010, CareNest began with a simple mission: to help aging adults and those with health challenges live with dignity and comfort in their own homes.</p>
                <p>Today, we're a team of over 200 certified caregivers, nurses, and therapists serving families across the region. Our approach is deeply personal — every care plan is uniquely tailored.</p>
                <p>We believe great care is about human connection, respect, and making every day meaningful.</p>
              </div>
              <div className="about-vals">
                {[["💚","Compassion"],["🤝","Integrity"],["🎯","Excellence"],["🌱","Growth"]].map(([icon,label])=>(
                  <div className="about-val" key={label}><div className="av-icon">{icon}</div><div className="av-lbl">{label}</div></div>
                ))}
              </div>
            </div>
            <div className="about-vis">
              🏡
              <div className="about-bdg"><div className="about-bdg-num">15+</div><div className="about-bdg-lbl">Years of Trusted Care</div></div>
            </div>
          </div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <div className="eyebrow">Families Say</div>
          <h2 className="sec-h">Stories of Care & Trust</h2>
          <div className="testi-grid">
            {TESTIMONIALS.map(t=>(
              <div className="testi-card" key={t.name}>
                <div className="testi-stars">{"★".repeat(t.stars)}</div>
                <p className="testi-txt">"{t.text}"</p>
                <div className="testi-auth">
                  <div className="testi-av">{t.initials}</div>
                  <div><div className="testi-nm">{t.name}</div><div className="testi-role">{t.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="cta-banner">
        <div className="cta-h">Ready to Get Started?</div>
        <p className="cta-sub">Book a free consultation today and let us find the perfect caregiver for your loved one.</p>
        <button className="btn-cta-wht" onClick={onBook}>📅 Book an Appointment</button>
      </div>
      <section className="section" id="contact">
        <div className="container">
          <div className="contact-split">
            <div>
              <div className="eyebrow">Get in Touch</div>
              <h2 className="sec-h">Let's Talk About Your Care Needs</h2>
              <p className="sec-sub">Our care coordinators are ready to answer questions and help you find the right solution.</p>
              <div className="contact-items">
                {[["📞","Phone","+1 (800) 555-CARE","Mon–Sun 7am – 9pm"],["📧","Email","hello@carenest.com","We reply within 2 hours"],["📍","Address","142 Maple Grove Ave","Greenfield, CA 90210"]].map(([icon,label,val,sub])=>(
                  <div className="c-item" key={label}>
                    <div className="c-icon">{icon}</div>
                    <div><div className="c-lbl">{label}</div><div className="c-val">{val}<br/>{sub}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="cf-box">
              <h3>Send Us a Message</h3>
              <div className="cf-row">
                <div className="cf-g"><label className="cf-l">First Name</label><input className="cf-i" placeholder="Jane"/></div>
                <div className="cf-g"><label className="cf-l">Last Name</label><input className="cf-i" placeholder="Doe"/></div>
              </div>
              <div className="cf-g"><label className="cf-l">Email</label><input className="cf-i" type="email" placeholder="jane@example.com"/></div>
              <div className="cf-g"><label className="cf-l">Phone</label><input className="cf-i" type="tel" placeholder="+1 (555) 000-0000"/></div>
              <div className="cf-g"><label className="cf-l">Service Needed</label><select className="cf-i"><option value="">Select...</option>{SERVICES.map(s=><option key={s.name}>{s.name}</option>)}</select></div>
              <div className="cf-g"><label className="cf-l">Message</label><textarea className="cf-i cf-ta" placeholder="Describe your care needs..."/></div>
              <button className="cf-sub">Send Message →</button>
            </div>
          </div>
        </div>
      </section>
      <footer className="footer">
        <div className="footer-top">
          <div>
            <div className="footer-brand"><div className="footer-brand-mark">🏡</div>CareNest</div>
            <p className="footer-desc">Compassionate, professional home care services that help your loved ones live with dignity, comfort, and joy.</p>
          </div>
          <div>
            <div className="footer-col-ttl">Services</div>
            <ul className="footer-links">{["Elder Care","Medical Assistance","Personal Hygiene","Meal Preparation","Physical Therapy"].map(s=><li key={s}><a>{s}</a></li>)}</ul>
          </div>
          <div>
            <div className="footer-col-ttl">Company</div>
            <ul className="footer-links">{["About Us","Our Team","Careers","Blog","Contact Us"].map(s=><li key={s}><a>{s}</a></li>)}</ul>
          </div>
          <div>
            <div className="footer-col-ttl">Contact</div>
            <ul className="footer-links"><li><a>+1 (800) 555-CARE</a></li><li><a>hello@carenest.com</a></li><li><a>142 Maple Grove Ave</a></li><li><a>Greenfield, CA 90210</a></li></ul>
          </div>
        </div>
        <div className="footer-bt">
          <div className="footer-copy">© 2025 CareNest Home Care Services. All rights reserved.</div>
          <div className="footer-legal">{["Privacy Policy","Terms of Service","Accessibility"].map(s=><a key={s}>{s}</a>)}</div>
        </div>
      </footer>
    </div>
  );
}

/* ─── TOAST STACK ─── */
function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack">
      {toasts.map(t=>(
        <div key={t.id} className={`toast${t.exiting?" exiting":""}`}>
          <div className="toast-ico">📅</div>
          <div className="toast-body">
            <div className="toast-ttl">New Booking — {t.service}</div>
            <div className="toast-msg">{t.name} · {t.time} · {t.ref}</div>
          </div>
          <button className="toast-close" onClick={()=>onDismiss(t.id)}>✕</button>
          <div className="toast-bar"/>
        </div>
      ))}
    </div>
  );
}

/* ─── NOTIFICATION BELL ─── */
function NotificationBell({ notifications, onMarkAllRead, onDismiss, onMarkRead }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [ringing, setRinging] = useState(false);
  const ref = useRef(null);
  const unread = notifications.filter(n=>!n.read).length;

  // ring bell when new notification arrives
  const prevLen = useRef(notifications.length);
  useEffect(()=>{
    if(notifications.length > prevLen.current){ setRinging(true); setTimeout(()=>setRinging(false),700); }
    prevLen.current = notifications.length;
  },[notifications.length]);

  // close panel on outside click
  useEffect(()=>{
    const h = e=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  const filtered = tab==="all" ? notifications : notifications.filter(n=>!n.read);

  const typeIcon = type => ({ booking:"📅", alert:"⚠️", system:"⚙️" }[type]||"🔔");
  const typeClass = type => ({ booking:"booking", alert:"alert", system:"system" }[type]||"booking");

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className={`notif-bell-btn${ringing?" ringing":""}`} onClick={()=>setOpen(o=>!o)}>
        🔔
        {unread>0&&<span className="notif-badge">{unread>9?"9+":unread}</span>}
      </button>
      {open&&(
        <div className="notif-panel">
          <div className="notif-panel-hd">
            <div className="notif-panel-ttl">
              Notifications {unread>0&&<span>{unread} new</span>}
            </div>
            <div className="notif-panel-acts">
              {unread>0&&<button className="notif-act-btn" onClick={onMarkAllRead}>Mark all read</button>}
              <button className="notif-act-btn" onClick={()=>setOpen(false)}>✕</button>
            </div>
          </div>
          <div className="notif-tabs">
            <button className={`notif-tab${tab==="all"?" active":""}`} onClick={()=>setTab("all")}>All ({notifications.length})</button>
            <button className={`notif-tab${tab==="unread"?" active":""}`} onClick={()=>setTab("unread")}>Unread ({unread})</button>
          </div>
          <div className="notif-list">
            {filtered.length===0?(
              <div className="notif-empty">
                <div className="notif-empty-ico">🎉</div>
                <div>You're all caught up!</div>
              </div>
            ):filtered.map(n=>(
              <div key={n.id} className={`notif-item${n.read?"":" unread"}`} onClick={()=>onMarkRead(n.id)}>
                <div className={`notif-ico ${typeClass(n.type)}`}>{typeIcon(n.type)}</div>
                <div className="notif-body">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-desc">{n.desc}</div>
                  <div className="notif-time">🕐 {n.time}</div>
                </div>
                <button className="notif-dismiss" onClick={e=>{e.stopPropagation();onDismiss(n.id);}}>✕</button>
              </div>
            ))}
          </div>
          <div className="notif-panel-ft">
            <a onClick={()=>setOpen(false)}>View all activity →</a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PHYSIOTHERAPISTS PANEL ─── */
function PhysiotherapistsPanel({ physiotherapists, bookings = [] }) {
  const EMPTY_FORM = { name:"", role:"Physiotherapist", exp:"", rating:"5.0", reviews:"0", photo:"", bio:"", fullBio:"", avail:"Mon – Fri", lang:"English", cert:"", education:"", tags:"", video:"", pricePerSession:"" };
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedPhysio, setSelectedPhysio] = useState(null);

  const setF = (k, v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""})); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.bio.trim()) e.bio = "Short bio is required";
    if (!form.cert.trim()) e.cert = "Certification is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const db = getDB();
      const data = {
        ...form,
        rating: parseFloat(form.rating) || 5.0,
        reviews: parseInt(form.reviews) || 0,
        pricePerSession: form.pricePerSession ? parseFloat(form.pricePerSession) : null,
        tags: form.tags,
        lang: form.lang,
        updatedAt: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(getDB(), "physiotherapists", editId), data);
        setSuccess("Physiotherapist updated successfully!");
      } else {
        await addDoc(collection(db, "physiotherapists"), { ...data, createdAt: serverTimestamp() });
        setSuccess("Physiotherapist added! They're now visible to clients on the website.");
      }
      setForm(EMPTY_FORM);
      setEditId(null);
      setShowForm(false);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error(err);
      setErrors({ _general: "Save failed: " + err.message });
    }
    setSaving(false);
  };

  const handleEdit = (p) => {
    setForm({
      name: p.name || "", role: p.role || "Physiotherapist", exp: p.exp || "",
      rating: String(p.rating || "5.0"), reviews: String(p.reviews || "0"),
      photo: p.photo || "", bio: p.bio || "", fullBio: p.fullBio || "",
      avail: p.avail || "Mon – Fri",
      lang: Array.isArray(p.lang) ? p.lang.join(", ") : (p.lang || "English"),
      cert: p.cert || "", education: p.education || "",
      tags: Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || ""),
      video: p.video || "",
      pricePerSession: p.pricePerSession || "",
    });
    setEditId(p._docId);
    setShowForm(true);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (docId, name) => {
    if (!window.confirm(`Remove "${name}" from the physiotherapists list?`)) return;
    setDeleting(docId);
    try {
      await deleteDoc(doc(getDB(), "physiotherapists", docId));
    } catch (err) { console.error(err); }
    setDeleting(null);
  };

  const handleCancel = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); setErrors({}); };

  const inputStyle = (err) => ({
    width:"100%", padding:"9px 12px", border:`1.5px solid ${err?"#e53e3e":"#e0e8e2"}`,
    borderRadius:10, fontSize:".85rem", fontFamily:"'Outfit',sans-serif",
    outline:"none", background:"#fff", color:"#2d3a2d", boxSizing:"border-box",
  });
  const labelStyle = { display:"block", fontSize:".78rem", fontWeight:600, color:"#4a6050", marginBottom:4 };
  const errStyle = { color:"#e53e3e", fontSize:".74rem", marginTop:3 };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.2rem"}}>
        <div>
          <div style={{fontWeight:700,fontSize:"1.1rem",color:"#2d3a2d"}}>🏃 Physiotherapists</div>
          <div style={{fontSize:".8rem",color:"var(--light)",marginTop:2}}>
            Manage your physiotherapy team — added specialists appear live on the website under Physical Therapy.
          </div>
        </div>
        {!showForm && (
          <button onClick={()=>{setShowForm(true);setEditId(null);setForm(EMPTY_FORM);}} style={{padding:"9px 18px",background:"var(--sage)",color:"#fff",border:"none",borderRadius:12,fontWeight:600,fontSize:".85rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:6}}>
            + Add Physiotherapist
          </button>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div style={{background:"#e5f5ec",border:"1.5px solid #a8d5b5",borderRadius:12,padding:"10px 16px",marginBottom:"1rem",display:"flex",alignItems:"center",gap:10,color:"#1a6a3a",fontSize:".85rem",fontWeight:600}}>
          ✅ {success}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div style={{background:"#fff",border:"1.5px solid #dde8df",borderRadius:18,padding:"1.5rem",marginBottom:"1.5rem",boxShadow:"0 4px 20px rgba(90,124,101,.08)"}}>
          <div style={{fontWeight:700,fontSize:"1rem",color:"#2d3a2d",marginBottom:"1.2rem",display:"flex",alignItems:"center",gap:8}}>
            {editId ? "✏️ Edit Physiotherapist" : "➕ Add New Physiotherapist"}
            <span style={{marginLeft:"auto",fontSize:".75rem",color:"var(--light)",fontWeight:400}}>Fields marked * are required</span>
          </div>

          {errors._general && <div style={{background:"#fff5f5",border:"1px solid #fc8181",borderRadius:10,padding:"10px 14px",marginBottom:"1rem",color:"#c53030",fontSize:".82rem"}}>{errors._general}</div>}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle(errors.name)} placeholder="e.g. Dr. Sarah Ahmed" value={form.name} onChange={e=>setF("name",e.target.value)}/>
              {errors.name && <div style={errStyle}>{errors.name}</div>}
            </div>
            <div>
              <label style={labelStyle}>Role / Title</label>
              <input style={inputStyle()} placeholder="e.g. Senior Physiotherapist" value={form.role} onChange={e=>setF("role",e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Experience</label>
              <input style={inputStyle()} placeholder="e.g. 8 yrs" value={form.exp} onChange={e=>setF("exp",e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Availability</label>
              <input style={inputStyle()} placeholder="e.g. Mon – Sat" value={form.avail} onChange={e=>setF("avail",e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Rating (1–5)</label>
              <input style={inputStyle()} type="number" min="1" max="5" step="0.1" placeholder="5.0" value={form.rating} onChange={e=>setF("rating",e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Number of Reviews</label>
              <input style={inputStyle()} type="number" min="0" placeholder="0" value={form.reviews} onChange={e=>setF("reviews",e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Price Per Session (PKR)</label>
              <input style={inputStyle()} type="number" min="0" placeholder="e.g. 3500" value={form.pricePerSession} onChange={e=>setF("pricePerSession",e.target.value)}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>Certification *</label>
              <input style={inputStyle(errors.cert)} placeholder="e.g. DPT, Certified Neurological PT" value={form.cert} onChange={e=>setF("cert",e.target.value)}/>
              {errors.cert && <div style={errStyle}>{errors.cert}</div>}
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>Education</label>
              <input style={inputStyle()} placeholder="e.g. BSc Physiotherapy, University of Karachi" value={form.education} onChange={e=>setF("education",e.target.value)}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>Speciality Tags <span style={{fontWeight:400,color:"var(--light)"}}>(comma separated)</span></label>
              <input style={inputStyle()} placeholder="e.g. Stroke Rehab, Sports Recovery, Post-Surgery" value={form.tags} onChange={e=>setF("tags",e.target.value)}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>Languages <span style={{fontWeight:400,color:"var(--light)"}}>(comma separated)</span></label>
              <input style={inputStyle()} placeholder="e.g. English, Urdu" value={form.lang} onChange={e=>setF("lang",e.target.value)}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>Short Bio * <span style={{fontWeight:400,color:"var(--light)"}}>(shown on card)</span></label>
              <textarea style={{...inputStyle(errors.bio),resize:"vertical",minHeight:70}} placeholder="A brief description shown on the specialist card..." value={form.bio} onChange={e=>setF("bio",e.target.value)}/>
              {errors.bio && <div style={errStyle}>{errors.bio}</div>}
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>Full Bio <span style={{fontWeight:400,color:"var(--light)"}}>(shown on profile page — use blank lines to separate paragraphs)</span></label>
              <textarea style={{...inputStyle(),resize:"vertical",minHeight:110}} placeholder="Detailed biography for the full profile page..." value={form.fullBio} onChange={e=>setF("fullBio",e.target.value)}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>Profile Photo URL <span style={{fontWeight:400,color:"var(--light)"}}>(paste a direct image link)</span></label>
              <input style={inputStyle()} placeholder="https://images.pexels.com/..." value={form.photo} onChange={e=>setF("photo",e.target.value)}/>
              {form.photo && <img src={form.photo} alt="preview" style={{width:64,height:64,borderRadius:12,objectFit:"cover",marginTop:8,border:"2px solid #e0e8e2"}} onError={e=>e.target.style.display="none"}/>}
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>Intro Video URL <span style={{fontWeight:400,color:"var(--light)"}}>(optional — shown on profile page)</span></label>
              <input style={inputStyle()} placeholder="https://videos.pexels.com/..." value={form.video} onChange={e=>setF("video",e.target.value)}/>
            </div>
          </div>

          <div style={{display:"flex",gap:10,marginTop:"1.4rem",justifyContent:"flex-end"}}>
            <button onClick={handleCancel} style={{padding:"9px 18px",background:"#f0f6f2",color:"var(--sage-d)",border:"none",borderRadius:12,fontWeight:600,fontSize:".85rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{padding:"9px 22px",background:"var(--sage)",color:"#fff",border:"none",borderRadius:12,fontWeight:700,fontSize:".85rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:saving?.7:1}}>
              {saving ? "Saving…" : editId ? "Update Physiotherapist ✓" : "Add to Website ✓"}
            </button>
          </div>
        </div>
      )}

      {/* Physiotherapists list */}
      {physiotherapists.length === 0 && !showForm ? (
        <div style={{textAlign:"center",padding:"3rem",background:"#f7fbf7",borderRadius:18,border:"1.5px dashed #c0d8c8"}}>
          <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>🏃</div>
          <div style={{fontWeight:600,color:"#4a6050",marginBottom:6}}>No physiotherapists added yet</div>
          <div style={{color:"var(--light)",fontSize:".85rem",marginBottom:"1.2rem"}}>Add your first physiotherapist — they'll appear live on the website immediately.</div>
          <button onClick={()=>setShowForm(true)} style={{padding:"9px 20px",background:"var(--sage)",color:"#fff",border:"none",borderRadius:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:".85rem"}}>
            + Add First Physiotherapist
          </button>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:"1rem"}}>
          {physiotherapists.map(p => (
            <div key={p._docId} onClick={()=>setSelectedPhysio(p)} style={{background:"#fff",border:"1.5px solid #e0e8e2",borderRadius:18,overflow:"hidden",boxShadow:"0 2px 12px rgba(90,124,101,.06)",transition:"box-shadow .2s, transform .15s",cursor:"pointer"}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 24px rgba(90,124,101,.15)";e.currentTarget.style.transform="translateY(-2px)"}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 2px 12px rgba(90,124,101,.06)";e.currentTarget.style.transform="translateY(0)"}}
            >
              <div style={{display:"flex",gap:12,padding:"1rem"}}>
                {p.photo ? (
                  <img src={p.photo} alt={p.name} style={{width:60,height:60,borderRadius:12,objectFit:"cover",flexShrink:0,border:"2px solid #e5f5ec"}}/>
                ) : (
                  <div style={{width:60,height:60,borderRadius:12,background:"linear-gradient(135deg,var(--sage),var(--sage-d))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",flexShrink:0,color:"#fff"}}>🏃</div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:".95rem",color:"#2d3a2d",marginBottom:1}}>{p.name}</div>
                  <div style={{fontSize:".78rem",color:"var(--sage)",fontWeight:600,marginBottom:4}}>{p.role}</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {p.exp && <span style={{fontSize:".7rem",background:"#f0f7f2",padding:"2px 8px",borderRadius:20,color:"var(--sage-d)",fontWeight:600}}>⏳ {p.exp}</span>}
                    <span style={{fontSize:".7rem",background:"#fff8e0",padding:"2px 8px",borderRadius:20,color:"#7a5c00",fontWeight:600}}>⭐ {p.rating}</span>
                    <span style={{fontSize:".7rem",background:"#f0f6f2",padding:"2px 8px",borderRadius:20,color:"var(--mid)",fontWeight:600}}>📅 {p.avail}</span>
                    {p.pricePerSession && <span style={{fontSize:".7rem",background:"#e8f5ee",padding:"2px 8px",borderRadius:20,color:"#1a7a42",fontWeight:700}}>💰 PKR {Number(p.pricePerSession).toLocaleString()}/session</span>}
                  </div>
                </div>
              </div>
              {p.bio && <div style={{padding:"0 1rem .8rem",fontSize:".8rem",color:"var(--mid)",lineHeight:1.6}}>{p.bio.length > 100 ? p.bio.slice(0,100)+"…" : p.bio}</div>}
              {p.tags && (
                <div style={{padding:"0 1rem .8rem",display:"flex",gap:5,flexWrap:"wrap"}}>
                  {(Array.isArray(p.tags) ? p.tags : p.tags.split(",")).map(t=>t.trim()).filter(Boolean).map(t=>(
                    <span key={t} style={{fontSize:".68rem",background:"#e8f5ee",padding:"2px 8px",borderRadius:20,color:"var(--sage-d)",fontWeight:600}}>{t}</span>
                  ))}
                </div>
              )}
              <div style={{borderTop:"1px solid #f0f4f1",padding:".8rem 1rem",display:"flex",gap:8,justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>setSelectedPhysio(p)} style={{padding:"6px 14px",background:"#f0f6f2",color:"var(--sage-d)",border:"none",borderRadius:10,fontWeight:600,fontSize:".78rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>👁 View</button>
                <button onClick={()=>handleEdit(p)} style={{padding:"6px 14px",background:"#f0f6f2",color:"var(--sage-d)",border:"none",borderRadius:10,fontWeight:600,fontSize:".78rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>✏️ Edit</button>
                <button onClick={()=>handleDelete(p._docId, p.name)} disabled={deleting===p._docId} style={{padding:"6px 14px",background:"#fff5f5",color:"#c53030",border:"none",borderRadius:10,fontWeight:600,fontSize:".78rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:deleting===p._docId?.6:1}}>
                  {deleting===p._docId ? "Removing…" : "🗑 Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPhysio && <PhysioDetailModal physio={selectedPhysio} bookings={bookings} onClose={()=>setSelectedPhysio(null)}/>}
    </div>
  );
}

/* ─── CAREGIVERS PANEL ─── */
function CaregiversPanel({ caregivers }) {
  const STATUS_OPTS = [
    { val:"on",  label:"On Duty",   color:"#1a7a42", bg:"#e5f5ec" },
    { val:"brk", label:"On Break",  color:"#9a7008", bg:"#fff8e0" },
    { val:"sc",  label:"Scheduled", color:"#2d5fa6", bg:"#e8f0fe" },
    { val:"off", label:"Off Duty",  color:"#888",    bg:"#f3f4f6" },
  ];
  const statusMeta = v => STATUS_OPTS.find(s=>s.val===v) || STATUS_OPTS[3];

  const EMPTY_FORM = { name:"", role:"", exp:"", cert:"", phone:"", email:"", speciality:"", notes:"", status:"sc" };
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const setF = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""})); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.role.trim()) e.role = "Role is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const db = getDB();
      const data = { ...form, updatedAt: serverTimestamp() };
      if (editId) {
        await updateDoc(doc(db, "caregivers", editId), data);
        setSuccess("Caregiver updated successfully!");
      } else {
        await addDoc(collection(db, "caregivers"), { ...data, createdAt: serverTimestamp() });
        setSuccess("Caregiver added to the system!");
      }
      setForm(EMPTY_FORM); setEditId(null); setShowForm(false);
      setTimeout(()=>setSuccess(""),3500);
    } catch(err){ console.error(err); }
    setSaving(false);
  };

  const handleEdit = (cg) => {
    setForm({ name:cg.name||"", role:cg.role||"", exp:cg.exp||"", cert:cg.cert||"", phone:cg.phone||"", email:cg.email||"", speciality:Array.isArray(cg.speciality)?cg.speciality.join(", "):cg.speciality||"", notes:cg.notes||"", status:cg.status||"sc" });
    setEditId(cg._docId); setShowForm(true); setErrors({});
    setTimeout(()=>document.getElementById("cg-form-top")?.scrollIntoView({behavior:"smooth"}),100);
  };

  const handleCancel = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); setErrors({}); };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeletingId(confirmDel._docId);
    try { await deleteDoc(doc(getDB(), "caregivers", confirmDel._docId)); } catch(err){ console.error(err); }
    setDeletingId(null); setConfirmDel(null);
  };

  const updateStatus = async (cg, newStatus) => {
    if (!cg._docId) return;
    setUpdatingStatus(cg._docId);
    try { await updateDoc(doc(getDB(), "caregivers", cg._docId), { status: newStatus }); } catch(err){ console.error(err); }
    setUpdatingStatus(null);
  };

  const filtered = caregivers.filter(cg => {
    const q = search.toLowerCase();
    const matchSearch = !q || cg.name?.toLowerCase().includes(q) || cg.role?.toLowerCase().includes(q) || cg.speciality?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || cg.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = { on: caregivers.filter(c=>c.status==="on").length, brk: caregivers.filter(c=>c.status==="brk").length, sc: caregivers.filter(c=>c.status==="sc").length, off: caregivers.filter(c=>c.status==="off").length };

  const inputStyle = (err) => ({ width:"100%", padding:"9px 12px", borderRadius:10, border:`1.5px solid ${err?"#e05555":"#d8e4dc"}`, fontFamily:"'Outfit',sans-serif", fontSize:".86rem", outline:"none", background:"#fff", color:"var(--txt)" });
  const labelStyle = { display:"block", fontSize:".78rem", fontWeight:600, color:"var(--mid)", marginBottom:5 };
  const errStyle = { fontSize:".73rem", color:"#e05555", marginTop:3 };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.4rem",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.5rem",fontWeight:700,color:"var(--txt)"}}>Caregivers</div>
          <div style={{fontSize:".8rem",color:"var(--light)",marginTop:2}}>{caregivers.length} total staff members</div>
        </div>
        <button onClick={()=>{handleCancel();setShowForm(s=>!s);}} style={{padding:"9px 20px",background:"var(--sage)",color:"#fff",border:"none",borderRadius:12,fontWeight:700,fontSize:".85rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:7}}>
          {showForm && !editId ? "✕ Cancel" : "+ Add Caregiver"}
        </button>
      </div>

      {/* Status summary pills */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:"1.4rem"}}>
        {[{val:"all",label:"All",color:"var(--sage-d)",bg:"#e8f5ee"},
          {val:"on", label:`On Duty (${counts.on})`,  color:"#1a7a42", bg:"#e5f5ec"},
          {val:"brk",label:`On Break (${counts.brk})`,color:"#9a7008", bg:"#fff8e0"},
          {val:"sc", label:`Scheduled (${counts.sc})`,color:"#2d5fa6", bg:"#e8f0fe"},
          {val:"off",label:`Off Duty (${counts.off})`,color:"#888",    bg:"#f3f4f6"},
        ].map(s=>(
          <button key={s.val} onClick={()=>setFilterStatus(s.val)} style={{padding:"5px 14px",borderRadius:20,fontWeight:700,fontSize:".75rem",border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif",background: filterStatus===s.val ? s.bg : "#fff",color: filterStatus===s.val ? s.color : "var(--light)",boxShadow: filterStatus===s.val ? `0 0 0 1.5px ${s.color}` : "0 0 0 1px #e0e8e2",transition:"all .18s"}}>
            {s.val!=="all"&&<span style={{width:7,height:7,borderRadius:"50%",background:s.color,display:"inline-block",marginRight:5}}/>}{s.label==="All"?`All (${caregivers.length})`:s.label}
          </button>
        ))}
        {/* Search */}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search by name, role…" style={{marginLeft:"auto",padding:"6px 14px",borderRadius:20,border:"1.5px solid #d8e4dc",fontFamily:"'Outfit',sans-serif",fontSize:".82rem",outline:"none",minWidth:200,color:"var(--txt)"}}/>
      </div>

      {success && <div style={{background:"#e5f5ec",border:"1px solid #b2dfc0",borderRadius:12,padding:"10px 16px",fontSize:".85rem",color:"#1a7a42",fontWeight:600,marginBottom:"1rem",display:"flex",alignItems:"center",gap:8}}>✅ {success}</div>}

      {/* Add / Edit Form */}
      {showForm && (
        <div id="cg-form-top" className="ac" style={{marginBottom:"1.4rem",border:"1.5px solid #c0d8c8"}}>
          <div style={{fontWeight:700,fontSize:".95rem",color:"var(--sage-d)",marginBottom:"1.2rem",display:"flex",alignItems:"center",gap:8}}>
            <span>{editId?"✏️ Edit Caregiver":"👩‍⚕️ Add New Caregiver"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle(errors.name)} value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="e.g. Emma Thompson"/>
              {errors.name && <div style={errStyle}>{errors.name}</div>}
            </div>
            <div>
              <label style={labelStyle}>Role / Title *</label>
              <input style={inputStyle(errors.role)} value={form.role} onChange={e=>setF("role",e.target.value)} placeholder="e.g. Registered Nurse"/>
              {errors.role && <div style={errStyle}>{errors.role}</div>}
            </div>
            <div>
              <label style={labelStyle}>Experience</label>
              <input style={inputStyle()} value={form.exp} onChange={e=>setF("exp",e.target.value)} placeholder="e.g. 8 yrs"/>
            </div>
            <div>
              <label style={labelStyle}>Certification</label>
              <input style={inputStyle()} value={form.cert} onChange={e=>setF("cert",e.target.value)} placeholder="e.g. RN, CNA, HHA"/>
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input style={inputStyle()} value={form.phone} onChange={e=>setF("phone",e.target.value)} placeholder="e.g. +92 300 1234567"/>
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input style={inputStyle()} value={form.email} onChange={e=>setF("email",e.target.value)} placeholder="e.g. emma@carenest.com" type="email"/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>Specialities <span style={{fontWeight:400,color:"var(--light)"}}>(comma separated)</span></label>
              <input style={inputStyle()} value={form.speciality} onChange={e=>setF("speciality",e.target.value)} placeholder="e.g. Elder Care, Dementia, Meal Prep"/>
            </div>
            <div>
              <label style={labelStyle}>Duty Status</label>
              <select value={form.status} onChange={e=>setF("status",e.target.value)} style={{...inputStyle(),cursor:"pointer"}}>
                <option value="on">On Duty</option>
                <option value="brk">On Break</option>
                <option value="sc">Scheduled</option>
                <option value="off">Off Duty</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Internal Notes</label>
              <input style={inputStyle()} value={form.notes} onChange={e=>setF("notes",e.target.value)} placeholder="e.g. Speaks Urdu, preferred mornings"/>
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:"1.4rem",justifyContent:"flex-end"}}>
            <button onClick={handleCancel} style={{padding:"9px 18px",background:"#f0f6f2",color:"var(--sage-d)",border:"none",borderRadius:12,fontWeight:600,fontSize:".85rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{padding:"9px 22px",background:"var(--sage)",color:"#fff",border:"none",borderRadius:12,fontWeight:700,fontSize:".85rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:saving?.7:1}}>
              {saving ? "Saving…" : editId ? "Update Caregiver ✓" : "Add Caregiver ✓"}
            </button>
          </div>
        </div>
      )}

      {/* Caregivers Table */}
      {filtered.length === 0 && !showForm ? (
        <div className="ac" style={{textAlign:"center",padding:"3rem",border:"1.5px dashed #c0d8c8"}}>
          <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>👩‍⚕️</div>
          <div style={{fontWeight:600,color:"#4a6050",marginBottom:6}}>{caregivers.length===0 ? "No caregivers added yet" : "No caregivers match your filter"}</div>
          <div style={{color:"var(--light)",fontSize:".85rem",marginBottom:"1.2rem"}}>{caregivers.length===0 ? "Add your first caregiver to track their schedules and assignments." : "Try adjusting your search or filter."}</div>
          {caregivers.length===0 && <button onClick={()=>setShowForm(true)} style={{padding:"9px 20px",background:"var(--sage)",color:"#fff",border:"none",borderRadius:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:".85rem"}}>+ Add First Caregiver</button>}
        </div>
      ) : (
        <div className="ac" style={{padding:0,overflow:"hidden"}}>
          <table className="bkt" style={{width:"100%"}}>
            <thead>
              <tr>
                <th style={{padding:"14px 16px"}}>Caregiver</th>
                <th>Role</th>
                <th>Specialities</th>
                <th>Contact</th>
                <th>Status</th>
                <th style={{textAlign:"right",paddingRight:16}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(cg => {
                const initials = cg.name ? cg.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
                const sm = statusMeta(cg.status);
                const specs = cg.speciality ? (Array.isArray(cg.speciality) ? cg.speciality : cg.speciality.split(",").map(s=>s.trim()).filter(Boolean)) : [];
                const isUpdating = updatingStatus === cg._docId;
                return (
                  <tr key={cg._docId || cg.id} style={{opacity: deletingId===cg._docId ? 0.4 : 1, transition:"opacity .3s"}}>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:11}}>
                        <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--sage),var(--sage-d))",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:".82rem",flexShrink:0}}>
                          {initials}
                        </div>
                        <div>
                          <div style={{fontWeight:600,fontSize:".88rem",color:"var(--txt)"}}>{cg.name}</div>
                          <div style={{fontSize:".73rem",color:"var(--light)",marginTop:1,display:"flex",gap:6}}>
                            {cg.exp && <span>⏳ {cg.exp}</span>}
                            {cg.cert && <span>· 🎓 {cg.cert}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{fontSize:".84rem",color:"var(--mid)",fontWeight:500}}>{cg.role || "—"}</td>
                    <td>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",maxWidth:220}}>
                        {specs.slice(0,3).map(s=>(
                          <span key={s} style={{fontSize:".68rem",background:"#e8f5ee",padding:"2px 7px",borderRadius:20,color:"var(--sage-d)",fontWeight:600,whiteSpace:"nowrap"}}>{s}</span>
                        ))}
                        {specs.length>3 && <span style={{fontSize:".68rem",background:"#f0f0f0",padding:"2px 7px",borderRadius:20,color:"var(--light)",fontWeight:600}}>+{specs.length-3}</span>}
                      </div>
                    </td>
                    <td style={{fontSize:".8rem",color:"var(--mid)"}}>
                      {cg.phone && <div>{cg.phone}</div>}
                      {cg.email && <div style={{color:"var(--sage)",fontSize:".75rem"}}>{cg.email}</div>}
                      {!cg.phone && !cg.email && <span style={{color:"var(--light)"}}>—</span>}
                    </td>
                    <td>
                      <select
                        value={cg.status || "sc"}
                        disabled={isUpdating || !cg._docId}
                        onChange={e=>updateStatus(cg, e.target.value)}
                        style={{appearance:"none",WebkitAppearance:"none",border:"none",borderRadius:20,fontSize:".73rem",fontWeight:700,padding:"4px 24px 4px 10px",cursor:"pointer",outline:"none",fontFamily:"'Outfit',sans-serif",background:`${sm.bg} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='${encodeURIComponent(sm.color)}'/%3E%3C/svg%3E") no-repeat right 7px center / 10px`,color:sm.color,opacity:isUpdating?.6:1,transition:"box-shadow .18s"}}
                      >
                        <option value="on">● On Duty</option>
                        <option value="brk">◑ On Break</option>
                        <option value="sc">◌ Scheduled</option>
                        <option value="off">○ Off Duty</option>
                      </select>
                    </td>
                    <td style={{textAlign:"right",paddingRight:16}}>
                      <div style={{display:"flex",gap:7,justifyContent:"flex-end"}}>
                        <button onClick={()=>handleEdit(cg)} style={{padding:"5px 12px",background:"#f0f6f2",color:"var(--sage-d)",border:"none",borderRadius:9,fontWeight:600,fontSize:".75rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>✏️ Edit</button>
                        <button onClick={()=>setConfirmDel(cg)} disabled={!cg._docId||deletingId===cg._docId} style={{padding:"5px 12px",background:"#fff5f5",color:"#c53030",border:"none",borderRadius:9,fontWeight:600,fontSize:".75rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:deletingId===cg._docId?.5:1}}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDel && (
        <div className="del-modal-ov" onClick={e=>e.target===e.currentTarget&&setConfirmDel(null)}>
          <div className="del-modal-box">
            <div className="del-modal-icon">🗑️</div>
            <div className="del-modal-ttl">Remove Caregiver?</div>
            <div className="del-modal-msg">
              You are about to permanently remove <span className="del-modal-name">{confirmDel.name}</span> from the system. This cannot be undone.
            </div>
            <div className="del-modal-acts">
              <button className="del-cancel-btn" onClick={()=>setConfirmDel(null)}>Cancel</button>
              <button className="del-confirm-btn" disabled={!!deletingId} onClick={handleDelete}>
                {deletingId ? "Removing…" : "🗑 Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── HELPER: generate deterministic fake attendance for demo ─── */
function genAttendance(seed, months = 3) {
  const records = [];
  const now = new Date();
  for (let m = months - 1; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const date = new Date(d.getFullYear(), d.getMonth(), day);
      if (date > now) break;
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      const hash = (seed.charCodeAt(0) * 31 + day * 17 + m * 7) % 100;
      let status = hash < 85 ? "present" : hash < 93 ? "late" : "absent";
      records.push({ date: new Date(date), status });
    }
  }
  return records;
}

/* ─── CLIENT DETAIL MODAL ─── */
function ClientDetailModal({ client, bookings, onClose }) {
  const initials = client.name ? client.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
  const clientBookings = bookings.filter(b => b.client === client.name);
  const attendance = genAttendance(client.name || "x");
  const present = attendance.filter(a=>a.status==="present").length;
  const late    = attendance.filter(a=>a.status==="late").length;
  const absent  = attendance.filter(a=>a.status==="absent").length;
  const total   = attendance.length;
  const rate    = total ? Math.round((present + late) / total * 100) : 0;
  const addedDate = client.createdAt?.toDate ? client.createdAt.toDate().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : "—";

  // last 5 weeks for mini calendar
  const calDays = attendance.slice(-35);

  const statusColor = { present:"#1a7a42", late:"#9a7008", absent:"#c53030" };
  const statusBg    = { present:"#e5f5ec", late:"#fff8e0",  absent:"#fde8e8" };

  return (
    <div style={{position:"fixed",inset:0,zIndex:99000,background:"rgba(15,20,15,.65)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:"1rem",overflowY:"auto"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:560,maxHeight:"95vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.25)",animation:"mUp .3s cubic-bezier(.22,1,.36,1)"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,var(--sage),var(--sage-d))",borderRadius:"24px 24px 0 0",padding:"1.8rem 1.8rem 1.4rem",position:"relative"}}>
          <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.2)",border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",color:"#fff",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:64,height:64,borderRadius:18,background:"rgba(255,255,255,.2)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"1.4rem",flexShrink:0,border:"2px solid rgba(255,255,255,.35)"}}>
              {initials}
            </div>
            <div>
              <div style={{color:"#fff",fontFamily:"'Cormorant Garamond',serif",fontSize:"1.5rem",fontWeight:700,lineHeight:1.2}}>{client.name}</div>
              <div style={{color:"rgba(255,255,255,.75)",fontSize:".82rem",marginTop:4,display:"flex",gap:12,flexWrap:"wrap"}}>
                <span>🏥 {client.service || "—"}</span>
                <span>📋 ID: {client.id || "—"}</span>
                <span>📅 Since {addedDate}</span>
              </div>
              <div style={{marginTop:8}}>
                <span style={{background: client.status==="active" ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.2)", color:"#fff", fontSize:".72rem", fontWeight:700, padding:"3px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,.3)"}}>
                  {client.status === "active" ? "● Active" : "○ Inactive"}
                </span>
                {client.isNew && <span style={{background:"#c9a85c",color:"#fff",fontSize:".7rem",fontWeight:800,padding:"3px 10px",borderRadius:20,marginLeft:8}}>NEW</span>}
              </div>
            </div>
          </div>
        </div>

        <div style={{padding:"1.5rem 1.8rem",display:"flex",flexDirection:"column",gap:"1.4rem"}}>

          {/* Attendance Summary */}
          <div>
            <div style={{fontWeight:700,fontSize:".9rem",color:"var(--txt)",marginBottom:"1rem",display:"flex",alignItems:"center",gap:8}}>
              📊 Attendance Overview <span style={{fontSize:".75rem",fontWeight:500,color:"var(--light)"}}>— last 3 months</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.8rem",marginBottom:"1rem"}}>
              {[
                {label:"Attendance Rate", value:`${rate}%`, color:"var(--sage)", bg:"#e8f5ee", icon:"📈"},
                {label:"Sessions Present", value:present, color:"#1a7a42", bg:"#e5f5ec", icon:"✅"},
                {label:"Late Arrivals",    value:late,    color:"#9a7008", bg:"#fff8e0", icon:"⏰"},
                {label:"Absences",         value:absent,  color:"#c53030", bg:"#fde8e8", icon:"❌"},
              ].map(s=>(
                <div key={s.label} style={{background:s.bg,borderRadius:14,padding:"12px 10px",textAlign:"center"}}>
                  <div style={{fontSize:"1.2rem",marginBottom:4}}>{s.icon}</div>
                  <div style={{fontWeight:800,fontSize:"1.2rem",color:s.color}}>{s.value}</div>
                  <div style={{fontSize:".65rem",color:"var(--mid)",fontWeight:600,marginTop:2,lineHeight:1.3}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Mini attendance heatmap */}
            <div style={{background:"#f7fbf7",borderRadius:14,padding:"1rem"}}>
              <div style={{fontSize:".75rem",fontWeight:600,color:"var(--light)",marginBottom:8}}>Recent Sessions</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {calDays.map((a,i)=>(
                  <div key={i} title={`${a.date.toLocaleDateString("en-US",{month:"short",day:"numeric"})}: ${a.status}`}
                    style={{width:18,height:18,borderRadius:4,background:statusBg[a.status],border:`1px solid ${statusColor[a.status]}22`,cursor:"default",flexShrink:0}}
                  />
                ))}
              </div>
              <div style={{display:"flex",gap:12,marginTop:8}}>
                {[{label:"Present",color:"#1a7a42",bg:"#e5f5ec"},{label:"Late",color:"#9a7008",bg:"#fff8e0"},{label:"Absent",color:"#c53030",bg:"#fde8e8"}].map(l=>(
                  <div key={l.label} style={{display:"flex",alignItems:"center",gap:5,fontSize:".7rem",color:"var(--mid)"}}>
                    <div style={{width:10,height:10,borderRadius:3,background:l.bg,border:`1px solid ${l.color}44`}}/>
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking History */}
          <div>
            <div style={{fontWeight:700,fontSize:".9rem",color:"var(--txt)",marginBottom:"1rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>📅 Booking History</span>
              <span style={{fontSize:".75rem",fontWeight:600,color:"var(--sage)"}}>{clientBookings.length} booking{clientBookings.length!==1?"s":""}</span>
            </div>
            {clientBookings.length === 0 ? (
              <div style={{textAlign:"center",padding:"1.5rem",background:"#f7fbf7",borderRadius:14,color:"var(--light)",fontSize:".85rem"}}>No bookings recorded for this client.</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {clientBookings.map((b,i)=>{
                  const stColors = {confirmed:{bg:"#e5f5ec",color:"#1a7a42"},pending:{bg:"#fff8e0",color:"#9a7008"},cancelled:{bg:"#fde8e8",color:"#b81c1c"},completed:{bg:"#e8f0fe",color:"#1a56b0"}};
                  const sc = stColors[b.status] || stColors.pending;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#f7fbf7",borderRadius:12,border:"1px solid #e5ede8"}}>
                      <div style={{width:36,height:36,borderRadius:10,background:"var(--sage)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".8rem",fontWeight:700,flexShrink:0}}>
                        {(b.id||"").replace("#","").slice(-3)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:".85rem",color:"var(--txt)"}}>{b.service}</div>
                        <div style={{fontSize:".73rem",color:"var(--light)",marginTop:2}}>
                          {b.date && <span>📅 {b.date}</span>}
                          {b.physiotherapist && <span style={{marginLeft:8}}>🏃 {b.physiotherapist}</span>}
                          {b.pricePerSession && <span style={{marginLeft:8}}>💰 PKR {Number(b.pricePerSession).toLocaleString()}</span>}
                        </div>
                      </div>
                      <span style={{padding:"3px 10px",borderRadius:20,fontSize:".7rem",fontWeight:700,background:sc.bg,color:sc.color,flexShrink:0}}>{b.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Client Info */}
          <div style={{background:"#f7fbf7",borderRadius:14,padding:"1.2rem",border:"1px solid #e0eae4"}}>
            <div style={{fontWeight:700,fontSize:".85rem",color:"var(--txt)",marginBottom:"0.8rem"}}>📋 Client Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem"}}>
              {[
                {label:"Client ID", value: client.id || "—"},
                {label:"Service",   value: client.service || "—"},
                {label:"Status",    value: client.status || "—"},
                {label:"Joined",    value: addedDate},
                {label:"Total Bookings", value: clientBookings.length},
                {label:"Completed",      value: clientBookings.filter(b=>b.status==="completed").length},
                {label:"Confirmed",      value: clientBookings.filter(b=>b.status==="confirmed").length},
                {label:"Cancelled",      value: clientBookings.filter(b=>b.status==="cancelled").length},
              ].map(r=>(
                <div key={r.label} style={{display:"flex",flexDirection:"column",gap:2}}>
                  <div style={{fontSize:".7rem",color:"var(--light)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>{r.label}</div>
                  <div style={{fontSize:".85rem",fontWeight:600,color:"var(--txt)"}}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── PHYSIOTHERAPIST DETAIL MODAL ─── */
function PhysioDetailModal({ physio, bookings, onClose }) {
  const initials = physio.name ? physio.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
  const physioBookings = bookings.filter(b => b.physiotherapist === physio.name || b.caregiver === physio.name);
  const attendance = genAttendance(physio.name || "y");
  const present = attendance.filter(a=>a.status==="present").length;
  const late    = attendance.filter(a=>a.status==="late").length;
  const absent  = attendance.filter(a=>a.status==="absent").length;
  const total   = attendance.length;
  const rate    = total ? Math.round((present + late) / total * 100) : 0;
  const calDays = attendance.slice(-35);
  const joinedDate = physio.createdAt?.toDate ? physio.createdAt.toDate().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : "—";
  const specs = physio.tags ? (Array.isArray(physio.tags) ? physio.tags : physio.tags.split(",").map(s=>s.trim()).filter(Boolean)) : [];
  const revenue = physioBookings.reduce((s,b)=>s + (b.pricePerSession ? Number(b.pricePerSession) : 0), 0);

  const statusColor = { present:"#1a7a42", late:"#9a7008", absent:"#c53030" };
  const statusBg    = { present:"#e5f5ec", late:"#fff8e0",  absent:"#fde8e8" };

  return (
    <div style={{position:"fixed",inset:0,zIndex:99000,background:"rgba(15,20,15,.65)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:"1rem",overflowY:"auto"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:600,maxHeight:"95vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.25)",animation:"mUp .3s cubic-bezier(.22,1,.36,1)"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#3d5747,#2a3d30)",borderRadius:"24px 24px 0 0",padding:"1.8rem 1.8rem 1.4rem",position:"relative"}}>
          <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.2)",border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",color:"#fff",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
            <div style={{flexShrink:0}}>
              {physio.photo ? (
                <img src={physio.photo} alt={physio.name} style={{width:72,height:72,borderRadius:18,objectFit:"cover",border:"2px solid rgba(255,255,255,.35)"}}/>
              ) : (
                <div style={{width:72,height:72,borderRadius:18,background:"rgba(255,255,255,.2)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"1.5rem",border:"2px solid rgba(255,255,255,.35)"}}>
                  {initials}
                </div>
              )}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"rgba(255,255,255,.6)",fontSize:".73rem",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>{physio.cert || "Specialist"}</div>
              <div style={{color:"#fff",fontFamily:"'Cormorant Garamond',serif",fontSize:"1.5rem",fontWeight:700,lineHeight:1.2}}>{physio.name}</div>
              <div style={{color:"rgba(255,255,255,.7)",fontSize:".82rem",marginTop:4}}>{physio.role}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                {physio.exp && <span style={{background:"rgba(255,255,255,.15)",color:"#fff",fontSize:".7rem",fontWeight:600,padding:"2px 10px",borderRadius:20}}>⏳ {physio.exp}</span>}
                {physio.avail && <span style={{background:"rgba(255,255,255,.15)",color:"#fff",fontSize:".7rem",fontWeight:600,padding:"2px 10px",borderRadius:20}}>📅 {physio.avail}</span>}
                {physio.rating && <span style={{background:"#c9a85c",color:"#fff",fontSize:".7rem",fontWeight:700,padding:"2px 10px",borderRadius:20}}>⭐ {physio.rating}</span>}
                {physio.pricePerSession && <span style={{background:"rgba(255,255,255,.15)",color:"#fff",fontSize:".7rem",fontWeight:700,padding:"2px 10px",borderRadius:20}}>💰 PKR {Number(physio.pricePerSession).toLocaleString()}/session</span>}
              </div>
            </div>
          </div>
        </div>

        <div style={{padding:"1.5rem 1.8rem",display:"flex",flexDirection:"column",gap:"1.4rem"}}>

          {/* KPI row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.8rem"}}>
            {[
              {label:"Attendance",    value:`${rate}%`,                             color:"var(--sage)", bg:"#e8f5ee", icon:"📊"},
              {label:"Sessions",      value:physioBookings.length,                  color:"#1a56b0",     bg:"#e8f0fe", icon:"📅"},
              {label:"Reviews",       value:physio.reviews || 0,                    color:"#9a7008",     bg:"#fff8e0", icon:"⭐"},
              {label:"Revenue",       value: revenue > 0 ? `PKR ${(revenue/1000).toFixed(0)}k` : "—", color:"#1a7a42", bg:"#e5f5ec", icon:"💰"},
            ].map(s=>(
              <div key={s.label} style={{background:s.bg,borderRadius:14,padding:"12px 10px",textAlign:"center"}}>
                <div style={{fontSize:"1.2rem",marginBottom:4}}>{s.icon}</div>
                <div style={{fontWeight:800,fontSize:"1.15rem",color:s.color}}>{s.value}</div>
                <div style={{fontSize:".65rem",color:"var(--mid)",fontWeight:600,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Attendance */}
          <div>
            <div style={{fontWeight:700,fontSize:".9rem",color:"var(--txt)",marginBottom:"1rem",display:"flex",alignItems:"center",gap:8}}>
              📊 Attendance <span style={{fontSize:".75rem",fontWeight:500,color:"var(--light)"}}>— last 3 months</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.7rem",marginBottom:"1rem"}}>
              {[
                {label:"Present", value:present, color:"#1a7a42", bg:"#e5f5ec", icon:"✅"},
                {label:"Late",    value:late,    color:"#9a7008", bg:"#fff8e0", icon:"⏰"},
                {label:"Absent",  value:absent,  color:"#c53030", bg:"#fde8e8", icon:"❌"},
              ].map(s=>(
                <div key={s.label} style={{background:s.bg,borderRadius:12,padding:"10px",textAlign:"center"}}>
                  <div style={{fontWeight:800,fontSize:"1.3rem",color:s.color}}>{s.value}</div>
                  <div style={{fontSize:".72rem",color:"var(--mid)",fontWeight:600}}>{s.icon} {s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#f7fbf7",borderRadius:14,padding:"1rem"}}>
              <div style={{fontSize:".75rem",fontWeight:600,color:"var(--light)",marginBottom:8}}>Session Heatmap</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {calDays.map((a,i)=>(
                  <div key={i} title={`${a.date.toLocaleDateString("en-US",{month:"short",day:"numeric"})}: ${a.status}`}
                    style={{width:18,height:18,borderRadius:4,background:statusBg[a.status],border:`1px solid ${statusColor[a.status]}22`,cursor:"default"}}
                  />
                ))}
              </div>
              <div style={{display:"flex",gap:12,marginTop:8}}>
                {[{label:"Present",color:"#1a7a42",bg:"#e5f5ec"},{label:"Late",color:"#9a7008",bg:"#fff8e0"},{label:"Absent",color:"#c53030",bg:"#fde8e8"}].map(l=>(
                  <div key={l.label} style={{display:"flex",alignItems:"center",gap:5,fontSize:".7rem",color:"var(--mid)"}}>
                    <div style={{width:10,height:10,borderRadius:3,background:l.bg,border:`1px solid ${l.color}44`}}/>
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Speciality Tags */}
          {specs.length > 0 && (
            <div>
              <div style={{fontWeight:700,fontSize:".9rem",color:"var(--txt)",marginBottom:"0.8rem"}}>🏷️ Specialities</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                {specs.map(s=><span key={s} style={{padding:"5px 14px",borderRadius:20,background:"#e8f5ee",color:"var(--sage-d)",fontWeight:600,fontSize:".8rem"}}>{s}</span>)}
              </div>
            </div>
          )}

          {/* Assigned Bookings */}
          <div>
            <div style={{fontWeight:700,fontSize:".9rem",color:"var(--txt)",marginBottom:"1rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>📅 Assigned Sessions</span>
              <span style={{fontSize:".75rem",fontWeight:600,color:"var(--sage)"}}>{physioBookings.length} total</span>
            </div>
            {physioBookings.length === 0 ? (
              <div style={{textAlign:"center",padding:"1.5rem",background:"#f7fbf7",borderRadius:14,color:"var(--light)",fontSize:".85rem"}}>No sessions assigned yet.</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {physioBookings.slice(0,6).map((b,i)=>{
                  const stColors = {confirmed:{bg:"#e5f5ec",color:"#1a7a42"},pending:{bg:"#fff8e0",color:"#9a7008"},cancelled:{bg:"#fde8e8",color:"#b81c1c"},completed:{bg:"#e8f0fe",color:"#1a56b0"}};
                  const sc = stColors[b.status] || stColors.pending;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#f7fbf7",borderRadius:12,border:"1px solid #e5ede8"}}>
                      <div style={{width:34,height:34,borderRadius:9,background:"#3d5747",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem",fontWeight:700,flexShrink:0}}>
                        {(b.id||"").replace("#","").slice(-3)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:".84rem",color:"var(--txt)"}}>{b.client}</div>
                        <div style={{fontSize:".73rem",color:"var(--light)",marginTop:2}}>
                          {b.service} {b.date && `· ${b.date}`}
                          {b.pricePerSession && <span style={{marginLeft:6,color:"var(--sage)",fontWeight:600}}>· PKR {Number(b.pricePerSession).toLocaleString()}</span>}
                        </div>
                      </div>
                      <span style={{padding:"3px 10px",borderRadius:20,fontSize:".7rem",fontWeight:700,background:sc.bg,color:sc.color,flexShrink:0}}>{b.status}</span>
                    </div>
                  );
                })}
                {physioBookings.length > 6 && <div style={{textAlign:"center",fontSize:".8rem",color:"var(--light)",padding:"4px 0"}}>+{physioBookings.length-6} more sessions</div>}
              </div>
            )}
          </div>

          {/* Professional Info */}
          <div style={{background:"#f7fbf7",borderRadius:14,padding:"1.2rem",border:"1px solid #e0eae4"}}>
            <div style={{fontWeight:700,fontSize:".85rem",color:"var(--txt)",marginBottom:"0.8rem"}}>📋 Professional Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.8rem"}}>
              {[
                {label:"Certification", value: physio.cert || "—"},
                {label:"Experience",    value: physio.exp  || "—"},
                {label:"Availability",  value: physio.avail|| "—"},
                {label:"Languages",     value: Array.isArray(physio.lang) ? physio.lang.join(", ") : physio.lang || "—"},
                {label:"Rating",        value: physio.rating ? `${physio.rating} / 5.0` : "—"},
                {label:"Total Reviews", value: physio.reviews || 0},
                {label:"Price/Session", value: physio.pricePerSession ? `PKR ${Number(physio.pricePerSession).toLocaleString()}` : "—"},
                {label:"Joined",        value: joinedDate},
              ].map(r=>(
                <div key={r.label} style={{display:"flex",flexDirection:"column",gap:2}}>
                  <div style={{fontSize:".7rem",color:"var(--light)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>{r.label}</div>
                  <div style={{fontSize:".84rem",fontWeight:600,color:"var(--txt)"}}>{r.value}</div>
                </div>
              ))}
            </div>
            {physio.education && (
              <div style={{marginTop:"0.8rem",paddingTop:"0.8rem",borderTop:"1px solid #e0eae4"}}>
                <div style={{fontSize:".7rem",color:"var(--light)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>Education</div>
                <div style={{fontSize:".84rem",color:"var(--txt)"}}>{physio.education}</div>
              </div>
            )}
            {physio.bio && (
              <div style={{marginTop:"0.8rem",paddingTop:"0.8rem",borderTop:"1px solid #e0eae4"}}>
                <div style={{fontSize:".7rem",color:"var(--light)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>Bio</div>
                <div style={{fontSize:".84rem",color:"var(--mid)",lineHeight:1.6}}>{physio.bio}</div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── ADMIN DASHBOARD ─── */
function AdminDashboard({ onBook, notifications, onMarkAllRead, onDismissNotif, onMarkRead, bookings, clients, caregivers, physiotherapists = [] }) {
  const [active, setActive] = useState("dashboard");
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);   // client object for detail modal
  const [selectedPhysio, setSelectedPhysio] = useState(null);   // physio object for detail modal

  const updateBookingStatus = async (docId, newStatus) => {
    if (!docId) return;
    setUpdatingStatus(docId);
    try {
      await updateDoc(doc(getDB(), "bookings", docId), { status: newStatus });
    } catch (err) {
      console.error("Status update failed:", err);
    }
    setUpdatingStatus(null);
  };

  // Reusable status dropdown component (inline)
  const StatusDropdown = ({ booking }) => {
    const status = booking.status || "pending";
    const isUpdating = updatingStatus === booking._docId;
    return (
      <select
        className={`status-select ${status}`}
        value={status}
        disabled={isUpdating || !booking._docId}
        onChange={e => updateBookingStatus(booking._docId, e.target.value)}
        title="Change booking status"
      >
        <option value="pending">⏳ Pending</option>
        <option value="confirmed">✅ Confirmed</option>
        <option value="completed">🏁 Completed</option>
        <option value="cancelled">❌ Cancelled</option>
      </select>
    );
  };

  const deleteClient = async () => {
    if (!confirmDelete) return;
    setDeletingClient(confirmDelete.docId);
    try {
      if (confirmDelete.docId) {
        await deleteDoc(doc(getDB(), "clients", confirmDelete.docId));
      }
    } catch (err) {
      console.error("Delete client failed:", err);
    }
    setDeletingClient(null);
    setConfirmDelete(null);
  };

  // ── Dynamic metrics derived from live state ──
  const totalBookings     = bookings.length;
  const prevTotalBookings = INITIAL_BOOKINGS.length;
  const bookingsDiff      = totalBookings - prevTotalBookings;

  const activeClients     = clients.filter(c => c.status === "active").length;
  const prevActiveClients = INITIAL_CLIENTS.filter(c => c.status === "active").length;
  const clientsDiff       = activeClients - prevActiveClients;

  const caregiversOnDuty  = caregivers.filter(c => c.status === "on" || c.st === "on").length;
  const prevOnDuty        = INITIAL_CAREGIVERS.filter(c => c.st === "on").length;
  const caregiversDiff    = caregiversOnDuty - prevOnDuty;

  // Revenue: base $84,320 + $650 per new booking
  const newBookings       = bookings.length - INITIAL_BOOKINGS.length;
  const revenue           = 84320 + newBookings * 650;
  const prevRevenue       = 84320;
  const revenueDiff       = revenue - prevRevenue;
  const revenueUp         = revenueDiff >= 0;

  // Chart: inject current month bookings count dynamically
  const currentMonth = new Date().getMonth(); // 0-indexed
  const dynamicChart = CHART_DATA.map((v,i) => i === currentMonth ? v + newBookings : v);
  const maxB = Math.max(...dynamicChart);

  // Top services computed from bookings
  const svcCounts = {};
  bookings.forEach(b => { svcCounts[b.service] = (svcCounts[b.service]||0) + 1; });
  const svcIcons = {"Elder Care":"🧓","Medical Assist.":"💊","Medical Assistance":"💊","Personal Hygiene":"🛁","Personal Care":"🛁","Meal Prep":"🍽️","Meal Preparation":"🍽️","Physical Therapy":"🏃","Companionship":"💬","Transportation":"🚗","Housekeeping":"🏠","Overnight Care":"🌙"};
  const svcColors = {"Elder Care":"#e5f5ec","Medical Assist.":"#fff8e0","Medical Assistance":"#fff8e0","Personal Hygiene":"#e8f0fe","Personal Care":"#e8f0fe","Meal Prep":"#fce8f3","Meal Preparation":"#fce8f3","Companionship":"#f0f6f2","Transportation":"#fff3e0","Physical Therapy":"#f3e5f5","Housekeeping":"#e0f7fa","Overnight Care":"#ede7f6"};
  const topServices = Object.entries(svcCounts)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5)
    .map(([nm,cnt])=>({ nm, cnt, icon: svcIcons[nm]||"🏥", bg: svcColors[nm]||"#f0f6f2", pct: Math.round(cnt/totalBookings*100)+"%"}));

  const metrics = [
    { icon:"📅", label:"Total Bookings",    value: totalBookings.toLocaleString(),  chg: bookingsDiff >= 0 ? `+${bookingsDiff}` : `${bookingsDiff}`,    up: bookingsDiff >= 0 },
    { icon:"👥", label:"Active Clients",    value: activeClients.toLocaleString(),  chg: clientsDiff >= 0  ? `+${clientsDiff}`  : `${clientsDiff}`,     up: clientsDiff >= 0  },
    { icon:"👩‍⚕️", label:"Caregivers On Duty", value: caregiversOnDuty.toString(),  chg: caregiversDiff >= 0 ? `+${caregiversDiff}` : `${caregiversDiff}`, up: caregiversDiff >= 0 },
    { icon:"💰", label:"Monthly Revenue",   value: "$"+revenue.toLocaleString(),    chg: (revenueUp?"+":"")+revenueDiff.toLocaleString(),                  up: revenueUp },
  ];

  const menu = [
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"bookings",icon:"📅",label:"Bookings",badge:String(bookings.filter(b=>b.status==="pending").length||"")},
    {id:"clients",icon:"👥",label:"Clients",badge:clients.filter(c=>c.isNew).length>0?String(clients.filter(c=>c.isNew).length):""},
    {id:"caregivers",icon:"👩‍⚕️",label:"Caregivers"},
    {id:"services",icon:"🏥",label:"Services"},
    {id:"reports",icon:"📈",label:"Reports"},
    {id:"messages",icon:"💬",label:"Messages",badge:"3"},
    {id:"settings",icon:"⚙️",label:"Settings"},
  ];
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="ab-box">
          <div className="ab-nm"><div className="ab-mark">🏡</div>CareNest</div>
          <div className="ab-sub">Admin Portal</div>
        </div>
        <nav className="sb-nav">
          <div className="sb-sec">Main Menu</div>
          {menu.slice(0,6).map(m=>(
            <div key={m.id} className={`sb-it${active===m.id?" active":""}`} onClick={()=>setActive(m.id)}>
              <span className="sb-ico">{m.icon}</span>{m.label}{m.badge&&<span className="sb-badge">{m.badge}</span>}
            </div>
          ))}
          <div className="sb-sec" style={{marginTop:"1rem"}}>Support</div>
          {menu.slice(6).map(m=>(
            <div key={m.id} className={`sb-it${active===m.id?" active":""}`} onClick={()=>setActive(m.id)}>
              <span className="sb-ico">{m.icon}</span>{m.label}{m.badge&&<span className="sb-badge">{m.badge}</span>}
            </div>
          ))}
        </nav>
        <div className="au-box">
          <div className="au-av">AD</div>
          <div><div className="au-nm">Admin User</div><div className="au-em">admin@carenest.com</div></div>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <div className="at-ttl">{menu.find(m=>m.id===active)?.icon} {menu.find(m=>m.id===active)?.label||"Dashboard"}</div>
          <div className="at-right">
            <span className="at-date">{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</span>
            <span style={{fontSize:".72rem",fontWeight:700,padding:"3px 10px",borderRadius:20,background:"#e5f5ec",color:"#1a7a42",display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:"#1a7a42",display:"inline-block",animation:"pulseDot .8s ease infinite"}}/>
              Firebase Live
            </span>
            <NotificationBell notifications={notifications} onMarkAllRead={onMarkAllRead} onDismiss={onDismissNotif} onMarkRead={onMarkRead}/>
            <button className="at-btn" onClick={onBook}>+ New Booking</button>
            <div className="at-av">AD</div>
          </div>
        </div>
        <div className="admin-content">
          {/* Firebase setup reminder — remove after adding your config */}
          <div style={{background:"linear-gradient(135deg,#fff8e1,#fffde7)",border:"1.5px solid #f6d860",borderRadius:16,padding:"1rem 1.4rem",marginBottom:"1.2rem",display:"flex",alignItems:"flex-start",gap:12}}>
            <span style={{fontSize:"1.4rem",flexShrink:0}}>🔥</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:".9rem",color:"#7a5c00",marginBottom:4}}>Firebase Setup Required</div>
              <div style={{fontSize:".8rem",color:"#9a7a00",lineHeight:1.6}}>
                Replace <code style={{background:"rgba(0,0,0,.06)",padding:"1px 6px",borderRadius:4}}>FIREBASE_CONFIG</code> at the top of this file with your real Firebase project credentials.
                {" "}Get them from <strong>Firebase Console → Project Settings → Web App</strong>. Also enable <strong>Firestore</strong> in your project and set rules to allow read/write.
                Once configured, bookings are stored in Firestore and the dashboard updates in real-time across all sessions.
              </div>
            </div>
          </div>
          {active === "dashboard" && (<>
          <div className="mg">
            {metrics.map(m=>(
              <div className="mc" key={m.label}>
                <div className="mc-top"><div className="mc-ico">{m.icon}</div><div className={`mc-chg ${m.up?"up":"dn"}`}>{m.up?"↑":"↓"} {m.chg}</div></div>
                <div className="mc-val">{m.value}</div>
                <div className="mc-lbl">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="ag2">
              <div className="ac">
              <div className="ac-hd">Recent Bookings <span>View all →</span></div>
              <table className="bkt">
                <thead><tr><th>ID</th><th>Client</th><th>Service</th><th>Physiotherapist</th><th>Price/Session</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {bookings.map(b=>(
                    <tr key={b._docId || b.id}>
                      <td style={{color:"var(--sage)",fontWeight:700}}>{b.id}</td>
                      <td style={{fontWeight:b.isNew?700:"normal",color:b.isNew?"var(--sage-d)":"inherit",display:"flex",alignItems:"center",gap:6}}>
                        {b.isNew&&<span style={{background:"var(--sage)",color:"#fff",fontSize:".62rem",fontWeight:800,padding:"1px 6px",borderRadius:20,letterSpacing:".04em"}}>NEW</span>}
                        {b.client}
                      </td>
                      <td style={{color:"var(--mid)",fontSize:".82rem"}}>{b.service}</td>
                      <td style={{color:"var(--sage-d)",fontSize:".82rem",fontWeight:b.physiotherapist?600:"normal"}}>
                        {b.physiotherapist ? <span style={{display:"flex",alignItems:"center",gap:5}}>🏃 {b.physiotherapist}</span> : <span style={{color:"var(--light)"}}>—</span>}
                      </td>
                      <td style={{fontSize:".82rem"}}>
                        {b.pricePerSession
                          ? <span style={{background:"#e8f5ee",color:"#1a7a42",fontWeight:700,padding:"2px 8px",borderRadius:20,fontSize:".78rem"}}>PKR {Number(b.pricePerSession).toLocaleString()}</span>
                          : <span style={{color:"var(--light)"}}>—</span>}
                      </td>
                      <td style={{color:"var(--light)",fontSize:".82rem"}}>{b.date}</td>
                      <td><StatusDropdown booking={b}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"1.2rem"}}>
              <div className="ac">
                <div className="ac-hd">Top Services <span>This Month</span></div>
                {topServices.length === 0 ? (
                  <div style={{color:"var(--light)",fontSize:".85rem",padding:"1rem 0"}}>No bookings yet.</div>
                ) : topServices.map(s=>(
                  <div className="sr" key={s.nm}>
                    <div className="sr-ico" style={{background:s.bg}}>{s.icon}</div>
                    <div className="sr-nm">{s.nm}</div>
                    <div className="sr-pct">{s.pct}</div>
                  </div>
                ))}
              </div>
              <div className="ac">
                <div className="ac-hd">Bookings 2026</div>
                <div className="cb-wrap">
                  <div className="cb-bars">
                    {dynamicChart.map((v,i)=><div key={i} className="cb" style={{height:`${(v/maxB)*100}%`,opacity: i===currentMonth?1:.65}} title={`${CHART_LABELS[i]}: ${v}`}/>)}
                  </div>
                  <div className="cb-ls">{CHART_LABELS.map(l=><div key={l} className="cb-l">{l}</div>)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="ac">
            <div className="ac-hd">Active Caregivers Today <span>Full schedule →</span></div>
            <div className="cg-grid">
              {caregivers.map(c=>(
                <div className="cg-chip" key={c.nm}>
                  <div className="cg-av">{c.init}</div>
                  <div style={{minWidth:0,flex:1}}>
                    <div className="cg-nm">{c.nm}</div>
                    <div className="cg-role">{c.role}</div>
                    <span className={`cg-st ${c.status||c.st}`}>{(c.status||c.st)==="on"?"On Duty":(c.status||c.st)==="brk"?"On Break":"Scheduled"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>)}

          {active === "caregivers" && (
            <CaregiversPanel caregivers={caregivers} />
          )}

          {active === "services" && (
            <PhysiotherapistsPanel physiotherapists={physiotherapists} bookings={bookings} />
          )}

          {active === "clients" && (
            <div className="ac">
              <div className="ac-hd">
                All Clients
                <span style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{background:"#e5f5ec",color:"#1a7a42",fontWeight:700,fontSize:".72rem",padding:"2px 10px",borderRadius:20}}>{clients.filter(c=>c.status==="active").length} active</span>
                  <span style={{background:"#fde8e8",color:"#b81c1c",fontWeight:700,fontSize:".72rem",padding:"2px 10px",borderRadius:20}}>{clients.filter(c=>c.status==="inactive").length} inactive</span>
                </span>
              </div>
              {clients.length === 0 ? (
                <div style={{textAlign:"center",padding:"3rem",color:"var(--light)",fontSize:".9rem"}}>No clients yet. They'll appear here after bookings are made.</div>
              ) : (
                <table className="bkt" style={{width:"100%"}}>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Service</th>
                      <th>Status</th>
                      <th>Added</th>
                      <th style={{textAlign:"right"}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(c => {
                      const initials = c.name ? c.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
                      const addedDate = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
                      return (
                        <tr key={c._docId || c.id} style={{opacity: deletingClient === c._docId ? 0.4 : 1, transition:"opacity .3s", cursor:"pointer"}} onClick={()=>setSelectedClient(c)}>
                          <td>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:36,height:36,borderRadius:50,background:"linear-gradient(135deg,var(--sage),var(--sage-d))",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:".78rem",flexShrink:0}}>
                                {initials}
                              </div>
                              <div>
                                <div style={{fontWeight:c.isNew?700:600,fontSize:".88rem",color:"var(--txt)",display:"flex",alignItems:"center",gap:6}}>
                                  {c.isNew && <span style={{background:"var(--sage)",color:"#fff",fontSize:".6rem",fontWeight:800,padding:"1px 6px",borderRadius:20}}>NEW</span>}
                                  {c.name}
                                </div>
                                <div style={{fontSize:".74rem",color:"var(--light)",marginTop:1}}>ID: {c.id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{color:"var(--mid)",fontSize:".83rem"}}>{c.service}</td>
                          <td>
                            <span style={{
                              padding:"3px 10px",borderRadius:20,fontSize:".73rem",fontWeight:700,
                              background: c.status==="active" ? "#e5f5ec" : "#f3f4f6",
                              color: c.status==="active" ? "#1a7a42" : "#6b7280"
                            }}>
                              {c.status === "active" ? "● Active" : "○ Inactive"}
                            </span>
                          </td>
                          <td style={{color:"var(--light)",fontSize:".8rem"}}>{addedDate}</td>
                          <td style={{textAlign:"right"}}>
                            <div style={{display:"flex",gap:7,justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}>
                              <button
                                style={{padding:"5px 12px",background:"#f0f6f2",color:"var(--sage-d)",border:"none",borderRadius:9,fontWeight:600,fontSize:".75rem",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}
                                onClick={()=>setSelectedClient(c)}
                              >👁 View</button>
                              <button
                                className="cl-del-btn"
                                disabled={deletingClient === c._docId || !c._docId}
                                onClick={() => setConfirmDelete({ docId: c._docId, name: c.name })}
                              >
                                🗑 Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {active === "bookings" && (
            <div className="ac">
              <div className="ac-hd">All Bookings <span>{bookings.length} total</span></div>
              <table className="bkt">
                <thead><tr><th>ID</th><th>Client</th><th>Service</th><th>Physiotherapist</th><th>Price/Session</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {bookings.map(b=>(
                    <tr key={b._docId || b.id}>
                      <td style={{color:"var(--sage)",fontWeight:700}}>{b.id}</td>
                      <td style={{fontWeight:b.isNew?700:"normal",color:b.isNew?"var(--sage-d)":"inherit",display:"flex",alignItems:"center",gap:6}}>
                        {b.isNew&&<span style={{background:"var(--sage)",color:"#fff",fontSize:".62rem",fontWeight:800,padding:"1px 6px",borderRadius:20,letterSpacing:".04em"}}>NEW</span>}
                        {b.client}
                      </td>
                      <td style={{color:"var(--mid)",fontSize:".82rem"}}>{b.service}</td>
                      <td style={{color:"var(--sage-d)",fontSize:".82rem",fontWeight:b.physiotherapist?600:"normal"}}>
                        {b.physiotherapist ? <span style={{display:"flex",alignItems:"center",gap:5}}>🏃 {b.physiotherapist}</span> : <span style={{color:"var(--light)"}}>—</span>}
                      </td>
                      <td style={{fontSize:".82rem"}}>
                        {b.pricePerSession
                          ? <span style={{background:"#e8f5ee",color:"#1a7a42",fontWeight:700,padding:"2px 8px",borderRadius:20,fontSize:".78rem"}}>PKR {Number(b.pricePerSession).toLocaleString()}</span>
                          : <span style={{color:"var(--light)"}}>—</span>}
                      </td>
                      <td style={{color:"var(--light)",fontSize:".82rem"}}>{b.date}</td>
                      <td><StatusDropdown booking={b}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Client Detail Modal ── */}
      {selectedClient && (
        <ClientDetailModal client={selectedClient} bookings={bookings} onClose={()=>setSelectedClient(null)}/>
      )}

      {/* ── Physio Detail Modal (from dashboard caregiver chips) ── */}
      {selectedPhysio && (
        <PhysioDetailModal physio={selectedPhysio} bookings={bookings} onClose={()=>setSelectedPhysio(null)}/>
      )}

      {/* ── Delete Confirm Modal ── */}
      {confirmDelete && (
        <div className="del-modal-ov" onClick={e=>e.target===e.currentTarget&&setConfirmDelete(null)}>
          <div className="del-modal-box">
            <div className="del-modal-icon">🗑️</div>
            <div className="del-modal-ttl">Delete Client?</div>
            <div className="del-modal-msg">
              You are about to permanently remove{" "}
              <span className="del-modal-name">{confirmDelete.name}</span>{" "}
              from the system. This action <strong>cannot be undone</strong> and will also remove their associated records.
            </div>
            <div className="del-modal-acts">
              <button className="del-cancel-btn" onClick={()=>setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="del-confirm-btn"
                disabled={!!deletingClient}
                onClick={deleteClient}
              >
                {deletingClient ? "Deleting…" : "🗑 Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ADMIN AUTH (SIGNUP / LOGIN) ─── */
function AdminAuth({ onSuccess, onBack }) {
  const [tab, setTab] = useState("signup"); // "signup" | "login"
  const [step, setStep] = useState(1); // signup: 1=role, 2=details, 3=success
  const [role, setRole] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState({ firstName:"", lastName:"", email:"", phone:"", department:"", password:"", confirm:"" });
  const [loginForm, setLoginForm] = useState({ email:"", password:"" });
  const [errors, setErrors] = useState({});

  const roles = [
    { id:"super_admin", ico:"👑", nm:"Super Admin", ds:"Full system access" },
    { id:"coordinator", ico:"📋", nm:"Care Coordinator", ds:"Bookings & client management" },
    { id:"manager", ico:"👔", nm:"Manager", ds:"Staff & reports access" },
    { id:"support", ico:"🛎️", nm:"Support Staff", ds:"Limited read access" },
  ];

  const pwStrength = pw => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strength = pwStrength(form.password);
  const strengthLabel = ["","Weak","Fair","Good","Strong"][strength] || "";

  const setF = (k, v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""})); setAlert(null); };
  const setLF = (k, v) => { setLoginForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""})); setAlert(null); };

  const validateSignup = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    if (!agreed) e.agreed = "You must accept the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateLogin = () => {
    const e = {};
    if (!loginForm.email.includes("@")) e.lemail = "Valid email required";
    if (!loginForm.password) e.lpassword = "Password required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = () => {
    if (!validateSignup()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(3); }, 1600);
  };

  const handleLogin = () => {
    if (!validateLogin()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (loginForm.email === "admin@carenest.com" && loginForm.password === "Admin123!") {
        onSuccess();
      } else {
        setAlert({ type:"error", msg:"Invalid credentials. Try admin@carenest.com / Admin123!" });
      }
    }, 1400);
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-mark">🏡</div>
          <span className="auth-brand-name">CareNest</span>
        </div>
        <div className="auth-hero">
          <div className="auth-hero-badge">⚡ Admin Portal</div>
          <h2>Manage Care,<br/>Shape <em>Outcomes</em></h2>
          <p>One powerful dashboard to oversee bookings, caregivers, clients, and real-time insights — all in one place.</p>
        </div>
        <div className="auth-perks">
          {[
            ["📊","Real-time Dashboard","Live metrics, charts & caregiver status"],
            ["🔐","Role-based Access","Granular permissions for every team member"],
            ["📅","Smart Scheduling","AI-assisted booking & shift management"],
            ["📈","Advanced Reports","Revenue, satisfaction & performance analytics"],
          ].map(([ico, nm, ds]) => (
            <div className="auth-perk" key={nm}>
              <div className="auth-perk-ico">{ico}</div>
              <div className="auth-perk-txt"><strong>{nm}</strong><span>{ds}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <button className="af-back" onClick={onBack}>← Back to website</button>

          {tab === "signup" && step < 3 && (
            <>
              <div className="auth-tabs">
                <button className={`auth-tab${tab==="signup"?" active":""}`} onClick={()=>{setTab("signup");setStep(1);setAlert(null)}}>Create Account</button>
                <button className={`auth-tab${tab==="login"?" active":""}`} onClick={()=>{setTab("login");setAlert(null)}}>Sign In</button>
              </div>

              {step === 1 && (
                <>
                  <div className="auth-form-ttl">Choose Your Role</div>
                  <div className="auth-form-sub">Select the role that best matches your responsibilities within CareNest.</div>
                  <div className="af-role-grid">
                    {roles.map(r => (
                      <div key={r.id} className={`af-role-card${role===r.id?" sel":""}`} onClick={()=>setRole(r.id)}>
                        <div className="rc-ico">{r.ico}</div>
                        <div className="rc-nm">{r.nm}</div>
                        <div className="rc-ds">{r.ds}</div>
                      </div>
                    ))}
                  </div>
                  <div className="af-alert info">🔒 All accounts require approval from a Super Admin before access is granted.</div>
                  <button className="af-submit" disabled={!role} onClick={()=>setStep(2)}>
                    Continue →
                  </button>
                  <div className="af-bottom">Already have an account? <a onClick={()=>{setTab("login");setAlert(null)}}>Sign in</a></div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="auth-form-ttl">Account Details</div>
                  <div className="auth-form-sub">Set up your admin credentials. You'll use these to sign in.</div>

                  {alert && <div className={`af-alert ${alert.type}`}>{alert.type==="error"?"⚠️":"ℹ️"} {alert.msg}</div>}

                  <div className="af-row">
                    <div className="af-g">
                      <label className="af-l">First Name *</label>
                      <input className={`af-i${errors.firstName?" err":""}`} placeholder="Jane" value={form.firstName} onChange={e=>setF("firstName",e.target.value)}/>
                      {errors.firstName && <div className="af-err">{errors.firstName}</div>}
                    </div>
                    <div className="af-g">
                      <label className="af-l">Last Name *</label>
                      <input className={`af-i${errors.lastName?" err":""}`} placeholder="Doe" value={form.lastName} onChange={e=>setF("lastName",e.target.value)}/>
                      {errors.lastName && <div className="af-err">{errors.lastName}</div>}
                    </div>
                  </div>

                  <div className="af-g">
                    <label className="af-l">Work Email *</label>
                    <input className={`af-i${errors.email?" err":""}`} type="email" placeholder="jane@carenest.com" value={form.email} onChange={e=>setF("email",e.target.value)}/>
                    {errors.email && <div className="af-err">{errors.email}</div>}
                  </div>

                  <div className="af-row">
                    <div className="af-g">
                      <label className="af-l">Phone</label>
                      <input className="af-i" type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e=>setF("phone",e.target.value)}/>
                    </div>
                    <div className="af-g">
                      <label className="af-l">Department</label>
                      <select className="af-i" value={form.department} onChange={e=>setF("department",e.target.value)}>
                        <option value="">Select...</option>
                        {["Operations","Care Coordination","Medical","Finance","IT","HR"].map(d=><option key={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="af-g">
                    <label className="af-l">Password *</label>
                    <div className="af-pw-wrap">
                      <input className={`af-i${errors.password?" err":""}`} type={showPw?"text":"password"} placeholder="Min. 8 characters" value={form.password} onChange={e=>setF("password",e.target.value)}/>
                      <button className="af-pw-eye" type="button" onClick={()=>setShowPw(s=>!s)}>{showPw?"🙈":"👁️"}</button>
                    </div>
                    {form.password && (
                      <>
                        <div className="af-strength">
                          {[1,2,3,4].map(i=><div key={i} className={`af-str-bar${strength>=i?(strength<=1?"w":strength<=2?"m":"s"):""}`}/>)}
                        </div>
                        <div className="af-str-txt">{strengthLabel} password</div>
                      </>
                    )}
                    {errors.password && <div className="af-err">{errors.password}</div>}
                  </div>

                  <div className="af-g">
                    <label className="af-l">Confirm Password *</label>
                    <div className="af-pw-wrap">
                      <input className={`af-i${errors.confirm?" err":""}`} type={showConfirm?"text":"password"} placeholder="Re-enter password" value={form.confirm} onChange={e=>setF("confirm",e.target.value)}/>
                      <button className="af-pw-eye" type="button" onClick={()=>setShowConfirm(s=>!s)}>{showConfirm?"🙈":"👁️"}</button>
                    </div>
                    {errors.confirm && <div className="af-err">{errors.confirm}</div>}
                  </div>

                  <div className="af-check-row">
                    <input type="checkbox" id="terms" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>
                    <label htmlFor="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>. I understand my account will require admin approval.</label>
                  </div>
                  {errors.agreed && <div className="af-err" style={{marginTop:-8,marginBottom:12}}>{errors.agreed}</div>}

                  <button className="af-submit" onClick={handleSignup} disabled={loading}>
                    {loading ? "Creating Account…" : "Create Admin Account ✓"}
                  </button>
                  <div className="af-bottom"><a onClick={()=>setStep(1)}>← Change role</a> · Already have an account? <a onClick={()=>setTab("login")}>Sign in</a></div>
                </>
              )}
            </>
          )}

          {tab === "signup" && step === 3 && (
            <div className="auth-success">
              <div className="as-circle">🎉</div>
              <div className="as-ttl">Account Requested!</div>
              <p className="as-msg">Your admin account has been submitted for approval. A Super Admin will review and activate your access within <strong>24 hours</strong>.</p>
              <div className="as-info">
                {[
                  ["Name", `${form.firstName} ${form.lastName}`],
                  ["Email", form.email],
                  ["Role", roles.find(r=>r.id===role)?.nm || role],
                  ["Status", "⏳ Pending Approval"],
                ].map(([k,v])=>(
                  <div className="as-info-row" key={k}><span>{k}</span><span>{v}</span></div>
                ))}
              </div>
              <button className="af-submit" onClick={()=>setTab("login")}>Go to Sign In →</button>
            </div>
          )}

          {tab === "login" && (
            <>
              <div className="auth-tabs">
                <button className={`auth-tab${tab==="signup"?" active":""}`} onClick={()=>{setTab("signup");setStep(1);setAlert(null)}}>Create Account</button>
                <button className={`auth-tab${tab==="login"?" active":""}`} onClick={()=>{setTab("login");setAlert(null)}}>Sign In</button>
              </div>
              <div className="auth-form-ttl">Welcome Back</div>
              <div className="auth-form-sub">Sign in to your CareNest admin portal.</div>

              {alert && <div className={`af-alert ${alert.type}`}>{alert.type==="error"?"⚠️":"ℹ️"} {alert.msg}</div>}

              <div className="af-alert info">💡 Demo: admin@carenest.com / Admin123!</div>

              <div className="af-g">
                <label className="af-l">Email Address *</label>
                <input className={`af-i${errors.lemail?" err":""}`} type="email" placeholder="admin@carenest.com" value={loginForm.email} onChange={e=>setLF("email",e.target.value)}/>
                {errors.lemail && <div className="af-err">{errors.lemail}</div>}
              </div>
              <div className="af-g">
                <label className="af-l">Password *</label>
                <div className="af-pw-wrap">
                  <input className={`af-i${errors.lpassword?" err":""}`} type={showPw?"text":"password"} placeholder="Your password" value={loginForm.password} onChange={e=>setLF("password",e.target.value)}/>
                  <button className="af-pw-eye" type="button" onClick={()=>setShowPw(s=>!s)}>{showPw?"🙈":"👁️"}</button>
                </div>
                {errors.lpassword && <div className="af-err">{errors.lpassword}</div>}
              </div>
              <div style={{textAlign:"right",marginBottom:"1.2rem"}}>
                <a style={{fontSize:".83rem",color:"var(--sage)",cursor:"pointer",fontWeight:500}}>Forgot password?</a>
              </div>
              <button className="af-submit" onClick={handleLogin} disabled={loading}>
                {loading ? "Signing In…" : "Sign In to Dashboard →"}
              </button>
              <div className="af-bottom">Don't have an account? <a onClick={()=>{setTab("signup");setStep(1);setAlert(null)}}>Create one</a></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── ROOT ─── */
export default function App() {
  const [page, setPage] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bookingSpecialist, setBookingSpecialist] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [caregivers, setCaregivers] = useState(INITIAL_CAREGIVERS);
  const [physiotherapists, setPhysiotherapists] = useState([]);
  const [dbReady, setDbReady] = useState(false);

  // ── Firebase: seed + live listeners ──────────────────────────────────────
  useEffect(() => {
    let unsub1, unsub2, unsub3;
    const init = async () => {
      try {
        await seedInitialData();
        const db = getDB();

        // Live bookings feed (newest first)
        unsub1 = onSnapshot(
          query(collection(db, "bookings"), orderBy("createdAt", "desc")),
          snap => {
            setBookings(snap.docs.map(d => ({ _docId: d.id, ...d.data() })));
            setDbReady(true);
          }
        );

        // Live clients feed
        unsub2 = onSnapshot(
          query(collection(db, "clients"), orderBy("createdAt", "asc")),
          snap => setClients(snap.docs.map(d => ({ _docId: d.id, ...d.data() })))
        );

        // Live physiotherapists feed
        unsub3 = onSnapshot(
          query(collection(db, "physiotherapists"), orderBy("createdAt", "asc")),
          snap => setPhysiotherapists(snap.docs.map(d => ({ _docId: d.id, ...d.data() })))
        );

        // Live caregivers feed
        const unsub4ref = onSnapshot(
          query(collection(db, "caregivers"), orderBy("createdAt", "asc")),
          snap => setCaregivers(snap.docs.map(d => ({ _docId: d.id, ...d.data() })))
        );
        // store for cleanup
        (window.__caregiverUnsub = unsub4ref);
      } catch (err) {
        console.error("Firebase init error:", err);
        setBookings(INITIAL_BOOKINGS);
        setClients(INITIAL_CLIENTS);
        setDbReady(true);
      }
    };
    init();
    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([
    { id:"n-sys-1", type:"system", title:"Admin Portal Ready", desc:"You're logged in successfully. Welcome back!", time:"Just now", read:false },
    { id:"n-sys-2", type:"booking", title:"Booking #B1042 Confirmed", desc:"Martha Johnson — Elder Care · Apr 22 · Emma T.", time:"2 hours ago", read:true },
    { id:"n-sys-3", type:"alert", title:"Caregiver Shift Gap", desc:"No coverage assigned for overnight slot Apr 23.", time:"5 hours ago", read:true },
  ]);
  const [toasts, setToasts] = useState([]);

  useEffect(()=>{ const h=()=>setScrolled(window.scrollY>60); window.addEventListener("scroll",h); return()=>window.removeEventListener("scroll",h); },[]);
  useEffect(()=>{ window.scrollTo(0,0); },[page]);

  const handleBooked = async (booking) => {
    const id = "n-" + Date.now();
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});

    const newBookingRow = {
      id: booking.ref,
      client: booking.name,
      service: booking.service,
      physiotherapist: booking.physiotherapist || null,
      pricePerSession: booking.pricePerSession || null,
      caregiver: booking.physiotherapist || "Unassigned",
      date: booking.date ? new Date(booking.date).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "TBD",
      status: "pending",
      isNew: true,
      createdAt: serverTimestamp(),
    };

    const newClientRow = {
      id: "C" + Date.now(),
      name: booking.name,
      service: booking.service,
      status: "active",
      isNew: true,
      createdAt: serverTimestamp(),
    };

    // Write to Firestore (onSnapshot will update UI automatically)
    try {
      const db = getDB();
      await addDoc(collection(db, "bookings"), newBookingRow);
      await addDoc(collection(db, "clients"), newClientRow);
    } catch (err) {
      console.error("Firestore write error:", err);
      // Fallback: update local state
      setBookings(bs => [newBookingRow, ...bs]);
      setClients(cs => [...cs, newClientRow]);
    }

    // ─── Send WhatsApp message to client ─────────────────────────────────────
    if (booking.phone) {
      const priceInfo = booking.pricePerSession
        ? `\n💰 Price per session: PKR ${Number(booking.pricePerSession).toLocaleString()}`
        : "";
      const therapistInfo = booking.physiotherapist
        ? `\n🏃 Physiotherapist: ${booking.physiotherapist}` : "";
      const waMsg = encodeURIComponent(
        `✅ *CareNest Booking Confirmed!*\n\n` +
        `Hi ${booking.name}, your appointment has been booked.\n\n` +
        `📋 *Booking Reference:* ${booking.ref}\n` +
        `🏥 *Service:* ${booking.service}` +
        therapistInfo +
        priceInfo + `\n` +
        `📅 *Date:* ${booking.date ? new Date(booking.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) : "TBD"}\n` +
        `⏰ *Time:* ${booking.time || "TBD"}\n\n` +
        `Our coordinator will contact you within 2 hours.\n\nThank you for choosing CareNest! 🏡`
      );
      const cleanPhone = booking.phone.replace(/[\s\-\(\)]/g, "");
      const waUrl = `https://wa.me/${cleanPhone}?text=${waMsg}`;
      window.open(waUrl, "_blank");
    }

    const newNotif = {
      id,
      type: "booking",
      title: `New Booking — ${booking.service}`,
      desc: `${booking.name}${booking.physiotherapist ? ` · ${booking.physiotherapist}` : ""} · ${booking.time||"TBD"} · ${booking.ref}${booking.pricePerSession ? ` · PKR ${Number(booking.pricePerSession).toLocaleString()}` : ""}`,
      time: `Today at ${timeStr}`,
      read: false,
    };
    setNotifications(ns=>[newNotif,...ns]);
    // show toast
    const toastId = "t-" + Date.now();
    setToasts(ts=>[...ts,{...booking,id:toastId}]);
    setTimeout(()=>{
      setToasts(ts=>ts.map(t=>t.id===toastId?{...t,exiting:true}:t));
      setTimeout(()=>setToasts(ts=>ts.filter(t=>t.id!==toastId)),400);
    },5000);
  };

  const dismissToast = id => {
    setToasts(ts=>ts.map(t=>t.id===id?{...t,exiting:true}:t));
    setTimeout(()=>setToasts(ts=>ts.filter(t=>t.id!==id)),400);
  };
  const markAllRead = () => setNotifications(ns=>ns.map(n=>({...n,read:true})));
  const dismissNotif = id => setNotifications(ns=>ns.filter(n=>n.id!==id));
  const markRead = id => setNotifications(ns=>ns.map(n=>n.id===id?{...n,read:true}:n));

  if (page === "auth") {
    return (
      <>
        <style>{CSS}</style>
        <AdminAuth onSuccess={()=>setPage("admin")} onBack={()=>setPage("home")}/>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <Navbar page={page} setPage={p=>{ if(p==="admin") setPage("auth"); else setPage(p); }} scrolled={scrolled} onBook={()=>{setBookingSpecialist(null);setShowModal(true);}}/>
      {page==="home"
        ? <HomePage onBook={(sp)=>{ setBookingSpecialist(sp||null); setShowModal(true); }} physiotherapists={physiotherapists}/>
        : !dbReady
          ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"80vh",flexDirection:"column",gap:"1rem",color:"var(--sage)"}}>
              <div style={{fontSize:"2.5rem",animation:"spin 1s linear infinite"}}>🏡</div>
              <div style={{fontWeight:600,fontSize:"1.1rem"}}>Connecting to database…</div>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
          )
          : <AdminDashboard
              onBook={()=>setShowModal(true)}
              notifications={notifications}
              onMarkAllRead={markAllRead}
              onDismissNotif={dismissNotif}
              onMarkRead={markRead}
              bookings={bookings}
              clients={clients}
              caregivers={caregivers}
              physiotherapists={physiotherapists}
            />
      }
      {showModal&&<BookingModal specialist={bookingSpecialist} onClose={()=>{setShowModal(false);setBookingSpecialist(null);}} onBooked={handleBooked}/>}
      <ToastStack toasts={toasts} onDismiss={dismissToast}/>
    </>
  );
}
