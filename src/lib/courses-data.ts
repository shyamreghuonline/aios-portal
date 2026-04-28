// Course data structure for AIOS EDU programs
export interface CourseData {
  [faculty: string]: {
    [course: string]: {
      streams: string[];
      duration: string;
    };
  };
}

export const coursesData: CourseData = {
  "Commerce & Management": {
    "Bachelor of Commerce (B.Com)": {
      streams: ["Commerce"],
      duration: "3 Years (6 Semesters)"
    },
    "B.Com (Honors) / B.Com (Honors with Research)": {
      streams: ["Commerce"],
      duration: "4 Years (8 Semesters)"
    },
    "Master of Commerce (M.Com)": {
      streams: ["Commerce"],
      duration: "2 Years (4 Semesters)"
    },
    "Master of Commerce (M.Com) - 1 Year": {
      streams: ["Commerce"],
      duration: "1 Year (2 Semesters)"
    },
    "Master of Business Administration (MBA)": {
      streams: ["Marketing", "Finance", "Human Resource Management", "International Business", "Digital Marketing", "Supply Chain Management", "E-Commerce", "Retail Management", "Hospitality Management", "Tourism Management", "Event Management", "Healthcare Management", "Operations Management", "Banking and Insurance", "Information Technology", "Sports Management", "Aviation Management", "Agri-Business Management", "Real Estate Management", "Banking and Finance", "Pharmaceutical Management", "Project Management", "Strategic Management", "Quality Management", "Rural Management", "Transport Management", "Media and Entertainment Management", "Taxation", "Risk Management", "Production Management", "Disaster Management", "Sustainability Management", "Fire and Safety Management", "Social Media Marketing", "Search Engine Optimization", "Content Marketing", "Marketing Research", "Brand Management", "Product Management", "Franchise Management", "Mobile Marketing", "Visual Merchandising", "Sales and Distribution Management", "Customer Insights", "Green Marketing", "Ethical Marketing", "Leadership and Team Management", "Emotional Intelligence in Business", "Time and Stress Management", "Business Negotiation", "Presentation and Communication Skills", "Analytics and AI"],
      duration: "2 Years (4 Semesters)"
    },
    "Master of Business Administration (MBA) - 1 Year": {
      streams: ["Marketing", "Finance", "Human Resource Management"],
      duration: "1 Year (2 Semesters)"
    },
    "Executive Master of Business Administration (E-MBA)": {
      streams: ["Marketing", "Finance", "Human Resource Management", "International Business", "Digital Marketing", "Supply Chain Management", "E-Commerce", "Retail Management", "Hospitality Management", "Tourism Management", "Event Management", "Healthcare Management", "Operations Management", "Banking and Insurance", "Information Technology", "Sports Management", "Aviation Management", "Agri-Business Management", "Real Estate Management", "Banking and Finance", "Pharmaceutical Management", "Project Management", "Strategic Management", "Quality Management", "Rural Management", "Transport Management", "Media and Entertainment Management", "Taxation", "Risk Management", "Production Management", "Disaster Management", "Sustainability Management", "Fire and Safety Management"],
      duration: "1 Year (2 Semesters)"
    },
    "Bachelor of Business Administration (BBA)": {
      streams: ["General"],
      duration: "3 Years (6 Semesters)"
    },
    "BBA (Honors) / BBA (Honors with Research)": {
      streams: ["General"],
      duration: "4 Years (8 Semesters)"
    },
    "Bachelor of Business Administration (BBA – Specializations)": {
      streams: ["Marketing", "Finance", "Human Resource Management", "International Business", "Digital Marketing", "Supply Chain Management", "E-Commerce", "Retail Management", "Hospitality Management", "Tourism Management", "Event Management", "Healthcare Management", "Operations Management", "Banking and Insurance", "Information Technology", "Sports Management", "Aviation Management", "Agri-Business Management", "Real Estate Management", "Banking and Finance", "Pharmaceutical Management", "Project Management", "Strategic Management", "Quality Management", "Rural Management", "Transport Management", "Media and Entertainment Management", "Taxation", "Risk Management", "Production Management", "Disaster Management", "Sustainability Management", "Fire and Safety Management"],
      duration: "3 Years (6 Semesters)"
    },
    "PG Diploma (Management fields)": {
      streams: ["Marketing", "Finance", "Human Resource Management", "International Business", "Digital Marketing", "Supply Chain Management", "E-Commerce", "Retail Management", "Hospitality Management", "Tourism Management", "Event Management", "Healthcare Management", "Operations Management", "Banking and Insurance", "Information Technology", "Sports Management", "Aviation Management", "Agri-Business Management", "Real Estate Management", "Banking and Finance", "Pharmaceutical Management", "Project Management", "Strategic Management", "Quality Management", "Rural Management", "Transport Management", "Media and Entertainment Management", "Taxation", "Risk Management", "Production Management", "Disaster Management", "Sustainability Management", "Fire and Safety Management"],
      duration: "1 Year (2 Semesters)"
    },
    "Diploma (Management fields)": {
      streams: ["Marketing", "Finance", "Human Resource Management", "International Business", "Digital Marketing", "Supply Chain Management", "E-Commerce", "Retail Management", "Hospitality Management", "Tourism Management", "Event Management", "Healthcare Management", "Operations Management", "Banking and Insurance", "Information Technology", "Sports Management", "Aviation Management", "Agri-Business Management", "Real Estate Management", "Banking and Finance", "Pharmaceutical Management", "Project Management", "Strategic Management", "Quality Management", "Rural Management", "Transport Management", "Media and Entertainment Management", "Taxation", "Risk Management", "Production Management", "Disaster Management", "Sustainability Management", "Fire and Safety Management"],
      duration: "2 Years (4 Semesters)"
    }
  },
  "Humanities & Social Science": {
    "BA (Bachelor of Arts)": {
      streams: ["General"],
      duration: "3 Years (6 Semesters)"
    },
    "B.A. (Honors) / B.A. (Honors with Research)": {
      streams: ["English", "Hindi", "Sanskrit", "Sociology", "Music", "History", "Political Science", "Philosophy", "Psychology", "Economics", "Public Administration", "Geography", "Rural Development", "Visual Arts", "Fine Arts", "Home Science"],
      duration: "4 Years (8 Semesters)"
    },
    "BA (Bachelor of Arts) – Additional": {
      streams: ["Additional"],
      duration: "1 Year (2 Semesters)"
    },
    "MA (Master of Arts)": {
      streams: ["English", "Hindi", "Sanskrit", "Sociology", "History", "Political Science", "Philosophy", "Psychology", "Economics", "Public Administration", "Geography", "Rural Development", "Human Rights", "International Relations", "Visual Arts", "Dance", "Music", "Theatre", "Performing Arts", "Fine Arts", "Astrology", "Home Science", "Mathematics"],
      duration: "2 Years (4 Semesters)"
    },
    "MA (Master of Arts) - 1 Year": {
      streams: ["English", "Hindi", "Sanskrit", "Sociology", "History", "Political Science", "Philosophy", "Psychology", "Economics", "Public Administration", "Geography", "Rural Development", "Visual Arts", "Fine Arts", "Home Science"],
      duration: "1 Year (2 Semesters)"
    },
    "BSW (Bachelor of Social Work)": {
      streams: ["Social Work"],
      duration: "3 Years (6 Semesters)"
    },
    "B.S.W. (Honors) / B.S.W. (Honors with Research)": {
      streams: ["Social Work"],
      duration: "4 Years (8 Semesters)"
    },
    "MSW (Master of Social Work)": {
      streams: ["Social Work"],
      duration: "2 Years (4 Semesters)"
    },
    "MSW (Master of Social Work) - 1 Year": {
      streams: ["Social Work"],
      duration: "1 Year (2 Semesters)"
    },
    "PG Diploma (Post Graduate Diploma)": {
      streams: ["Psychology and Counseling", "Social Work"],
      duration: "1 Year (2 Semesters)"
    },
    "Diploma": {
      streams: ["Social Work", "Vastu Shastra", "Jyothishyam", "Human Studies"],
      duration: "1 Year (2 Semesters)"
    },
    "Certificate": {
      streams: ["Social Work", "Human Studies"],
      duration: "1 Year (2 Semesters)"
    }
  },
  "Science": {
    "B.Sc": {
      streams: ["Physics", "Chemistry", "Mathematics (PCM)", "Zoology", "Botany", "Chemistry (ZBC)"],
      duration: "3 Years (6 Semesters)"
    },
    "B.Sc. (Honours) / B.Sc. (Honours with Research)": {
      streams: ["Statistics", "Electronics", "Fire Safety & Hazard Management (FSHM)", "Automobile", "Physics", "Mathematics", "Environmental Science", "Food & Nutrition", "Chemistry", "Microbiology", "Bio Science", "Biochemistry", "Geology", "Botany", "Zoology", "Bio-Informatics"],
      duration: "4 Years (8 Semesters)"
    },
    "B.Sc. (Honours)": {
      streams: ["Animation & Multimedia", "Jewellery Designing", "Textile Designing", "Interior Designing", "Fashion Technology", "Hotel Management", "Fire and Safety Management", "Industry Safety and Fire", "Health Safety and Environment"],
      duration: "3 Years (6 Semesters)"
    },
    "M.Sc.": {
      streams: ["Physics", "Chemistry", "Mathematics", "Zoology", "Botany", "Microbiology", "Environmental Science", "Yoga", "Computer Science", "Information Technology", "Home Science", "Food and Nutrition", "Biotechnology", "Biochemistry", "Biological Science", "Statistics"],
      duration: "2 Years (4 Semesters)"
    },
    "M.Sc. - 1 Year": {
      streams: ["Physics", "Chemistry", "Mathematics", "Zoology", "Botany", "Microbiology", "Environmental Science", "Yoga", "Computer Science", "Information Technology", "Home Science", "Food and Nutrition", "Biotechnology", "Biochemistry", "Biological Science", "Statistics"],
      duration: "1 Year (2 Semesters)"
    },
    "Post Graduate Diploma": {
      streams: ["Dietetics and Applied Nutrition", "Food Processing and Preservation", "Industry Safety and Fire"],
      duration: "1 Year (2 Semesters)"
    },
    "Diploma Course": {
      streams: ["Dietetics and Applied Nutrition", "Food Processing and Preservation", "Industry Safety and Fire"],
      duration: "1 Year (2 Semesters)"
    }
  },
  "Library & Information Science": {
    "B.LIS": {
      streams: ["Library and Information Science"],
      duration: "1 Year (2 Semesters)"
    },
    "M.LIS": {
      streams: ["Library and Information Science"],
      duration: "1 Year (2 Semesters)"
    },
    "D.LIS": {
      streams: ["Library and Information Science"],
      duration: "1 Year (2 Semesters)"
    }
  },
  "Education & Sports": {
    "B.A. (Honors) / B.A. (Honors with Research) - Education": {
      streams: ["Education"],
      duration: "4 Years (8 Semesters)"
    },
    "MA (Master of Arts) - Education": {
      streams: ["Education"],
      duration: "2 Years (4 Semesters)"
    },
    "MA (Master of Arts) - Education - 1 Year": {
      streams: ["Education"],
      duration: "1 Year (2 Semesters)"
    },
    "B.P.E.S.": {
      streams: ["Physical Education and Sports"],
      duration: "3 Years (6 Semesters)"
    },
    "B.P.E.S. (Honors) / B.P.E.S. (Honors with Research)": {
      streams: ["Physical Education and Sports"],
      duration: "4 Years (8 Semesters)"
    },
    "M.P.E.S.": {
      streams: ["Physical Education and Sports"],
      duration: "2 Years (4 Semesters)"
    },
    "M.P.E.S. - 1 Year": {
      streams: ["Physical Education and Sports"],
      duration: "1 Year (2 Semesters)"
    },
    "PG Diploma (Post Graduate Diploma) - Education": {
      streams: ["Guidance & Counseling", "Early Childhood Care & Education"],
      duration: "1 Year (2 Semesters)"
    }
  },
  "Journalism & Mass Communication": {
    "BA (Bachelor of Arts) - Journalism": {
      streams: ["Journalism and Mass Communication"],
      duration: "3 Years (6 Semesters)"
    },
    "B.A. (Honors) / B.A. (Honors with Research) - Journalism": {
      streams: ["Journalism and Mass Communication"],
      duration: "4 Years (8 Semesters)"
    },
    "MA (Master of Arts) - Journalism": {
      streams: ["Journalism and Mass Communication"],
      duration: "2 Years (4 Semesters)"
    },
    "MA (Master of Arts) - Journalism - 1 Year": {
      streams: ["Journalism and Mass Communication"],
      duration: "1 Year (2 Semesters)"
    },
    "Post Graduate Diploma - Journalism": {
      streams: ["Journalism and Mass Communication"],
      duration: "1 Year (2 Semesters)"
    },
    "Diploma (Diploma in) - Journalism": {
      streams: ["Journalism and Mass Communication"],
      duration: "1 Year (2 Semesters)"
    }
  },
  "Engineering & Technology": {
    "B.C.A.": {
      streams: ["General"],
      duration: "3 Years (6 Semesters)"
    },
    "B.C.A. (Honors) / B.C.A. (Honors with Research)": {
      streams: ["General"],
      duration: "4 Years (8 Semesters)"
    },
    "M.C.A.": {
      streams: ["General"],
      duration: "2 Years (4 Semesters)"
    },
    "M.C.A. - 1 Year": {
      streams: ["General"],
      duration: "1 Year (2 Semesters)"
    },
    "B.Sc - Engineering": {
      streams: ["Computer Engineering", "Information Technology", "Biotechnology", "Bio-Chemistry", "Computer Application"],
      duration: "3 Years (6 Semesters)"
    },
    "M.Sc - Engineering": {
      streams: ["Information Technology", "Biotechnology", "Bio Informatics", "Bio Chemistry", "Computer Application"],
      duration: "2 Years (4 Semesters)"
    },
    "D.C.A.": {
      streams: ["General"],
      duration: "1 Year (2 Semesters)"
    },
    "P.G.D.C.A.": {
      streams: ["General"],
      duration: "1 Year (2 Semesters)"
    },
    "B.Tech": {
      streams: ["Aerodynamics", "Aerospace Engineering", "Agricultural Biotechnology", "Agricultural Engineering", "AI & Robotics", "Applied AI & Ethics", "Applied Sciences and Engineering", "Artificial Intelligence (AI)", "Artificial Intelligence & Data Science", "Augmented Reality", "Virtual Reality (AR/VR)", "Automobile Engineering", "Autonomous Vehicle Engineering", "Avionics Engineering", "Big Data Analytics", "Biochemical Engineering", "Bioinformatics", "Biomedical Engineering", "Biotechnology", "Blockchain Technology", "Brain-Computer Interface", "CAD/CAM Engineering", "Chemical Engineering", "Civil Engineering", "Climate and Sustainable Development", "Cloud Computing", "Cognitive Computing", "Cognitive Science & Engineering", "Computer Science and Engineering (CSE)", "Computer Vision", "Construction Technology", "Cyber Security", "Data Science", "Defense Technology", "Design Engineering", "DevOps Engineering", "Digital Health & Health Informatics", "Digital Transformation Engineering", "E-Governance and Smart Public Systems", "Electrical and Power Engineering", "Electrical Engineering", "Electronics and Communication Engineering (ECE)", "Electronics and Electrical Engineering (EEE)", "Embedded Systems", "Energy and Environmental Engineering", "Energy Storage Technology", "Engineering Design & Innovation", "Engineering Management", "Engineering Mathematics", "Engineering Physics", "Environmental Engineering", "FinTech Engineering", "Food Technology", "Full Stack Development", "Game Development", "Genetic Engineering", "Geotechnical Engineering", "Human-Computer Interaction", "Industrial Engineering", "Industrial IoT", "Information Technology (IT)", "Infrastructure and Project Management", "Instrumentation Engineering", "Internet of Things (IoT)", "Machine Learning (ML)", "Marine Engineering", "Mechanical Engineering (ME)", "Mechatronics Engineering", "Metallurgical Engineering", "Mining Engineering", "Missile Technology", "Mobile Application Development", "Nano Technology", "Neurotechnology Engineering", "Nuclear Engineering", "Optical Communication", "Petroleum Engineering", "Pharmaceutical Engineering", "Power Electronics", "Power Systems", "Production Engineering", "Project Management", "Quality Management", "Quantum Computing", "Radar and Satellite Communication", "Real Estate Engineering", "Refining Engineering", "Renewable Energy", "Robotics and Automation", "Satellite Communication", "Signal Processing", "Smart Grid Technology", "Software Engineering", "Space Technology", "Structural Engineering", "Sustainable Energy", "Systems Engineering", "Telecommunication Engineering", "Textile Engineering", "Thermal Engineering", "Transportation Engineering", "Urban Planning", "VLSI Design", "Water Resources Engineering", "Wireless Communication"],
      duration: "4 Years (8 Semesters)"
    },
    "B.Tech-LE (Lateral Entry)": {
      streams: ["Aerodynamics", "Aerospace Engineering", "Agricultural Biotechnology", "Agricultural Engineering", "AI & Robotics", "Applied AI & Ethics", "Applied Sciences and Engineering", "Artificial Intelligence (AI)", "Artificial Intelligence & Data Science", "Augmented Reality", "Virtual Reality (AR/VR)", "Automobile Engineering", "Autonomous Vehicle Engineering", "Avionics Engineering", "Big Data Analytics", "Biochemical Engineering", "Bioinformatics", "Biomedical Engineering", "Biotechnology", "Blockchain Technology", "Brain-Computer Interface", "CAD/CAM Engineering", "Chemical Engineering", "Civil Engineering", "Climate and Sustainable Development", "Cloud Computing", "Cognitive Computing", "Cognitive Science & Engineering", "Computer Science and Engineering (CSE)", "Computer Vision", "Construction Technology", "Cyber Security", "Data Science", "Defense Technology", "Design Engineering", "DevOps Engineering", "Digital Health & Health Informatics", "Digital Transformation Engineering", "E-Governance and Smart Public Systems", "Electrical and Power Engineering", "Electrical Engineering", "Electronics and Communication Engineering (ECE)", "Electronics and Electrical Engineering (EEE)", "Embedded Systems", "Energy and Environmental Engineering", "Energy Storage Technology", "Engineering Design & Innovation", "Engineering Management", "Engineering Mathematics", "Engineering Physics", "Environmental Engineering", "FinTech Engineering", "Food Technology", "Full Stack Development", "Game Development", "Genetic Engineering", "Geotechnical Engineering", "Human-Computer Interaction", "Industrial Engineering", "Industrial IoT", "Information Technology (IT)", "Infrastructure and Project Management", "Instrumentation Engineering", "Internet of Things (IoT)", "Machine Learning (ML)", "Marine Engineering", "Mechanical Engineering (ME)", "Mechatronics Engineering", "Metallurgical Engineering", "Mining Engineering", "Missile Technology", "Mobile Application Development", "Nano Technology", "Neurotechnology Engineering", "Nuclear Engineering", "Optical Communication", "Petroleum Engineering", "Pharmaceutical Engineering", "Power Electronics", "Power Systems", "Production Engineering", "Project Management", "Quality Management", "Quantum Computing", "Radar and Satellite Communication", "Real Estate Engineering", "Refining Engineering", "Renewable Energy", "Robotics and Automation", "Satellite Communication", "Signal Processing", "Smart Grid Technology", "Software Engineering", "Space Technology", "Structural Engineering", "Sustainable Energy", "Systems Engineering", "Telecommunication Engineering", "Textile Engineering", "Thermal Engineering", "Transportation Engineering", "Urban Planning", "VLSI Design", "Water Resources Engineering", "Wireless Communication"],
      duration: "3 Years (6 Semesters)"
    },
    "M.Tech": {
      streams: ["Computer Science and Engineering", "Artificial Intelligence", "Machine Learning", "Data Science", "Cyber Security", "Information Technology", "Software Engineering", "Cloud Computing", "Big Data Analytics", "Blockchain Technology", "VLSI Design", "Embedded Systems", "Signal Processing", "Power Systems", "Control Systems", "Renewable Energy", "Energy Systems", "Power Electronics", "Electrical Drives", "Robotics and Automation", "Mechatronics", "Instrumentation Engineering", "Thermal Engineering", "CAD/CAM", "Manufacturing Engineering", "Automobile Engineering", "Aerospace Engineering", "Avionics", "Structural Engineering", "Transportation Engineering", "Geotechnical Engineering", "Environmental Engineering", "Construction Technology and Management", "Water Resources Engineering", "Remote Sensing", "Urban Planning", "Architecture Engineering", "Bioinformatics", "Biotechnology", "Food Technology", "Pharmaceutical Technology", "Nanotechnology", "Textile Engineering", "Petroleum Engineering", "Mining Engineering", "Metallurgical Engineering", "Corrosion Engineering", "Polymer Technology", "Industrial Engineering", "Production Engineering", "Engineering Design", "Material Science and Engineering", "Optoelectronics", "Photonics", "Instrumentation and Control", "Communication Engineering", "Wireless Communication", "Microwave Engineering", "Radar and Satellite Communication", "Digital Communication", "RF and Microwave Engineering", "Electronics and Communication Engineering", "Telecommunication Engineering", "Microelectronics", "Nanoelectronics", "Internet of Things (IoT)", "Smart Grid Technology", "Electric Vehicles Technology", "Sustainable Energy", "Solar Energy Engineering", "Wind Energy Systems", "Hydro Power Systems", "Green Technology", "Civil Infrastructure Engineering", "Earthquake Engineering", "Industrial Safety Engineering", "Fire and Safety Engineering", "Marine Engineering", "Naval Architecture", "Ocean Engineering", "Geoinformatics", "Climate Engineering", "Environmental Management", "Agricultural Engineering", "Irrigation Engineering", "Aquaculture Engineering", "Textile Chemistry", "Printing Technology", "Ceramic Engineering", "Mining Engineering", "Petroleum Engineering", "Metallurgical Engineering", "Polymer Technology", "Rubber Technology", "Plastic Technology", "Petrochemical Engineering", "Food Processing Technology", "Dairy Technology", "Oil Technology", "Pulp and Paper Technology", "Sugar Technology", "Leather Technology", "Packaging Technology", "Industrial Engineering", "Production Engineering", "Textile Technology", "Apparel Technology", "Fashion Technology", "Garment Technology", "Knitting Technology", "Textile Chemistry", "Textile Physics", "Fiber Technology", "Yarn Technology", "Fabric Formation Technology", "Textile Processing Technology", "Textile Engineering", "Man-Made Fiber Technology", "Technical Textiles", "Smart Textiles", "Nanotextiles", "Medical Textiles", "Geotextiles", "Automotive Textiles", "Protective Textiles", "Sports Textiles", "Home Textiles", "Industrial Textiles", "Agricultural Textiles", "Packaging Textiles", "Construction Textiles", "Marine Textiles", "Aerospace Textiles", "Military Textiles", "Electronics Textiles", "Optical Textiles", "Thermal Textiles", "Acoustic Textiles", "Fire Resistant Textiles", "Waterproof Textiles", "Stain Resistant Textiles", "Anti-Microbial Textiles", "UV Protective Textiles", "Electro-Conductive Textiles", "Shape Memory Textiles", "Phase Change Textiles", "Self-Cleaning Textiles", "Self-Healing Textiles", "Color Changing Textiles", "Light Emitting Textiles", "Energy Harvesting Textiles", "Sensing Textiles", "Actuating Textiles", "Communicating Textiles", "Computing Textiles", "Storing Textiles", "Displaying Textiles", "Generating Textiles", "Filtering Textiles", "Separating Textiles", "Absorbing Textiles", "Adsorbing Textiles", "Desorbing Textiles", "Catalyzing Textiles", "Reacting Textiles", "Transforming Textiles", "Storing Textiles", "Transporting Textiles", "Protecting Textiles", "Insulating Textiles", "Conducting Textiles", "Sensing Textiles", "Actuating Textiles", "Communicating Textiles", "Computing Textiles", "Displaying Textiles", "Generating Textiles", "Storing Textiles", "Filtering Textiles", "Separating Textiles", "Absorbing Textiles", "Adsorbing Textiles", "Desorbing Textiles", "Catalyzing Textiles", "Reacting Textiles", "Transforming Textiles", "Storing Textiles", "Transporting Textiles", "Protecting Textiles", "Insulating Textiles", "Conducting Textiles"],
      duration: "2 Years (4 Semesters)"
    },
    "Diploma Engineering": {
      streams: ["Mechanical Engineering", "Computer Science & Engineering", "Electrical Engineering", "Civil Engineering", "Chemical Engineering", "Electronics and Communication Engineering", "Biotechnology", "Information Technology", "Environmental Engineering", "Agricultural Engineering", "Automobile Engineering", "Electrical & Electronics Engineering", "Biochemical Engineering", "Biomedical Engineering", "Infrastructure Engineering", "Mining Engineering", "Textile Engineering", "Structural Engineering", "Metallurgical Engineering", "Fire Safety Engineering", "Industrial Engineering", "Power Engineering"],
      duration: "3 Years (6 Semesters)"
    },
    "Diploma Engineering – Lateral Entry": {
      streams: ["Mechanical Engineering", "Computer Science & Engineering", "Electrical Engineering", "Civil Engineering", "Chemical Engineering", "Electronics and Communication Engineering", "Biotechnology", "Information Technology", "Environmental Engineering", "Agricultural Engineering", "Automobile Engineering", "Electrical & Electronics Engineering", "Biochemical Engineering", "Biomedical Engineering", "Infrastructure Engineering", "Mining Engineering", "Textile Engineering", "Structural Engineering", "Metallurgical Engineering", "Fire Safety Engineering", "Industrial Engineering", "Power Engineering"],
      duration: "2 Years (4 Semesters)"
    }
  },
  "Agriculture Science": {
    "B.Sc. (Bachelor of Science) – Honors": {
      streams: ["Agriculture"],
      duration: "4 Years (8 Semesters)"
    },
    "M.Sc. (Master of Science)": {
      streams: ["Agriculture (Agronomy)"],
      duration: "2 Years (4 Semesters)"
    },
    "Diploma": {
      streams: ["Agriculture"],
      duration: "2 Years (4 Semesters)"
    }
  },
  "Yoga Science": {
    "Diploma in": {
      streams: ["Yoga"],
      duration: "1 Year (2 Semesters)"
    },
    "Bachelor of Arts, Bachelor of Science": {
      streams: ["Yoga"],
      duration: "3 Years (6 Semesters)"
    },
    "Bachelor of Naturopathy and Yogic Sciences (BNYS)": {
      streams: ["General"],
      duration: "4.5 Year"
    },
    "Bachelor of Naturopathy and Yogic Sciences (BNYS) - 3 Years": {
      streams: ["General"],
      duration: "3 Years (6 Semesters)"
    },
    "Diploma of Naturopathy and Yogic Sciences (DNYS)": {
      streams: ["General"],
      duration: "2 Years (4 Semesters)"
    },
    "Master of Arts, Master of Science (MA, M.Sc in Yoga)": {
      streams: ["Yoga"],
      duration: "2 Years (4 Semesters)"
    },
    "Post Graduate Diploma": {
      streams: ["Yoga"],
      duration: "1 Year (2 Semesters)"
    }
  },
  "Fashion & Animation": {
    "Diploma in (Diploma)": {
      streams: ["Animation", "Graphic and Web Designing", "Video Editing and VFX", "3D Animation and Visual Effects", "Beauty Care and Health", "Textile Design", "Fashion & Apparel Design"],
      duration: "1 Year (2 Semesters)"
    },
    "Bachelor of Science (BSC)": {
      streams: ["Animation", "Graphic and Web Designing", "Video Editing and VFX", "3D Animation and Visual Effects", "Beauty Care and Health", "Textile Design", "Fashion & Apparel Design"],
      duration: "3 Years (6 Semesters)"
    },
    "Bachelor of Arts (B.A)": {
      streams: ["Animation & Multimedia", "Animation and Graphic Design", "Beauty Care and Health", "Fashion Design & Retail Management", "Fashion Management", "Textile Design", "Fashion & Apparel Design", "Fashion Portfolio Industry"],
      duration: "3 Years (6 Semesters)"
    },
    "Bachelor of Fine Arts (BFA)": {
      streams: ["Animation", "Graphics", "Web Design"],
      duration: "4 Years (8 Semesters)"
    },
    "Master of Fine Arts (MFA)": {
      streams: ["Fine Arts"],
      duration: "2 Years (4 Semesters)"
    },
    "Master of Arts (M.A)": {
      streams: ["Fashion Accessory Design & Technology", "Fashion Industry", "Textile Design", "Fashion Portfolio Development", "Fashion Development"],
      duration: "2 Years (4 Semesters)"
    },
    "Master of Science (M.SC)": {
      streams: ["Animation", "Graphic and Web Designing", "Video Editing and VFX", "3D Animation and Visual Effects", "Beauty Care and Health", "Textile Design", "Fashion & Apparel Design", "Fashion Portfolio Industry", "Dramatics", "Cinematics"],
      duration: "2 Years (4 Semesters)"
    },
    "B.Des.": {
      streams: ["Fashion Designing"],
      duration: "4 Years (8 Semesters)"
    },
    "M.Des.": {
      streams: ["Fashion Designing"],
      duration: "2 Years (4 Semesters)"
    },
    "Post Graduate Diploma in (Pg Diploma)": {
      streams: ["Animation", "Graphic and Web Designing", "Video Editing and VFX", "3D Animation and Visual Effects", "Beauty Care and Health", "Textile Design", "Fashion & Apparel Design", "Fashion Portfolio Industry", "Dramatics", "Cinematics"],
      duration: "1 Year (2 Semesters)"
    }
  },
  "Law": {
    "LL.B.": {
      streams: ["General"],
      duration: "3 Years (6 Semesters)"
    },
    "B.A.-LL.B": {
      streams: ["General"],
      duration: "5 Years (10 Semesters)"
    },
    "LL.M.": {
      streams: ["Criminal Law", "Intellectual Property Law", "Commercial Law", "Corporate Law", "Constitutional Law", "International Trade Law", "Administrative Law", "Family Law", "Tax Law", "Banking Law", "Cyber Law", "International Law", "Security & Investment Law", "Consumer Protection", "Contract", "Human Rights", "Business Law"],
      duration: "2 Years (4 Semesters)"
    }
  },
  "Pharmacy": {
    "D.Pharmacy": {
      streams: ["General"],
      duration: "2 Years"
    },
    "B.Pharmacy": {
      streams: ["General"],
      duration: "4 Years (8 Semesters)"
    },
    "B.Pharmacy- LE": {
      streams: ["General"],
      duration: "3 Years (6 Semesters)"
    }
  },
  "Paramedical Sciences": {
    "Certificate": {
      streams: ["Medical Dresser", "Dental Technician & Hygiene", "Dialysis Technician", "ECG Technician", "Medical Lab Technology (MLT)", "Multipurpose Health Worker", "Operation Theater Technology (OTT)", "Optometry", "Ultra Sound Technology (UST)", "X-Ray Technician", "CT Scan Technician", "Radiology & Imaginary Technology (RIT)"],
      duration: "1 Year (2 Semesters)"
    },
    "Diploma": {
      streams: ["Physiotherapy", "Dental Technician & Hygiene", "ECG Technician", "Medical Lab Technology (MLT)", "Multipurpose Health Worker", "Operation Theater Technology (OTT)", "X-Ray Technician", "CT Scan Technician", "Radiology & Imaginary Technology (RIT)", "Medical Dresser"],
      duration: "2 Years (4 Semesters)"
    },
    "Diploma - 1.5 Years": {
      streams: ["Community Medical Service and Essential Drugs"],
      duration: "1.5 Years (3 Semesters)"
    },
    "B.Sc": {
      streams: ["Dental Technician & Hygiene", "ECG Technician", "Medical Lab Technology (MLT)", "Multipurpose Health Worker", "Operation Theater Technology (OTT)", "X-Ray Technician", "CT Scan Technician", "Optometry", "Radiology & Imaginary Technology (RIT)"],
      duration: "3 Years (6 Semesters)"
    },
    "BMLT, BRIT": {
      streams: ["BMLT", "BRIT"],
      duration: "3 Years (6 Semesters)"
    },
    "BPT (Bachelor of Physiotherapy)": {
      streams: ["BPT (Bachelor of Physiotherapy)"],
      duration: "4.5 Years (9 Months Internship)"
    },
    "BPT (Bachelor of Physiotherapy) - 3 Years": {
      streams: ["Physiotherapy"],
      duration: "3 Years (6 Semesters)"
    },
    "BPH (Bachelor of Public Health)": {
      streams: ["BPH (Bachelor of Public Health)"],
      duration: "4 Years (8 Semesters)"
    },
    "M.Sc": {
      streams: ["Dental Technician & Hygiene", "ECG Technician", "Medical Lab Technology (MLT)", "Multipurpose Health Worker", "Operation Theater Technology (OTT)", "X-Ray Technician", "CT Scan Technician", "Radiology & Imaginary Technology (RIT)", "Dietetics and Applied Nutrition", "Optometry", "Medical Laboratory Technology"],
      duration: "2 Years (4 Semesters)"
    },
    "MPH": {
      streams: ["MPH (Master of Public Health)"],
      duration: "2 Years (4 Semesters)"
    }
  },
  "Vocational Education": {
    "Diploma in Computer Applications": {
      streams: ["General"],
      duration: "1 Year (2 Semesters)"
    },
    "Certificate in Digital Marketing": {
      streams: ["General"],
      duration: "6 Months"
    },
    "Certificate in Tally": {
      streams: ["General"],
      duration: "3 Months"
    },
    "Diploma in Office Management": {
      streams: ["General"],
      duration: "6 Months"
    }
  },
  "Doctoral Programs": {
    "Ph.D (Doctor of Philosophy)": {
      streams: ["Management", "Engineering", "Science", "Humanities", "Commerce"],
      duration: "3-5 Years"
    }
  },
  "Credit Transfer Programs": {
    "B.Tech Credit Transfer": {
      streams: ["Computer Science", "Mechanical", "Civil", "Electrical"],
      duration: "Variable (Based on Credits)"
    },
    "MBA Credit Transfer": {
      streams: ["General", "Finance", "Marketing"],
      duration: "Variable (Based on Credits)"
    }
  },
  "Custom/Other": {
    "Custom Course": {
      streams: ["Custom"],
      duration: "Custom"
    }
  }
};

// Helper function to get faculties
export function getFaculties(): string[] {
  return Object.keys(coursesData);
}

// Helper function to get courses for a faculty
export function getCourses(faculty: string): string[] {
  return faculty && coursesData[faculty] ? Object.keys(coursesData[faculty]) : [];
}

// Helper function to get streams for a course
export function getStreams(faculty: string, course: string): string[] {
  return faculty && course && coursesData[faculty]?.[course]
    ? coursesData[faculty][course].streams
    : [];
}

// Helper function to get duration for a course
export function getDuration(faculty: string, course: string): string {
  return faculty && course && coursesData[faculty]?.[course]
    ? coursesData[faculty][course].duration
    : "";
}
