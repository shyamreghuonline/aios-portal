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
  "Engineering & Technology": {
    "B.Tech (Bachelor of Technology)": {
      streams: ["Computer Science", "Mechanical", "Civil", "Electrical", "Electronics"],
      duration: "4 Years (8 Semesters)"
    },
    "M.Tech (Master of Technology)": {
      streams: ["Computer Science", "Mechanical", "Civil", "Electrical"],
      duration: "2 Years (4 Semesters)"
    },
    "Diploma in Engineering": {
      streams: ["Computer Science", "Mechanical", "Civil", "Electrical"],
      duration: "3 Years (6 Semesters)"
    }
  },
  "Commerce & Management": {
    "BBA (Bachelor of Business Administration)": {
      streams: ["General", "Finance", "Marketing", "HR"],
      duration: "3 Years (6 Semesters)"
    },
    "MBA (Master of Business Administration)": {
      streams: ["General", "Finance", "Marketing", "HR", "Operations"],
      duration: "2 Years (4 Semesters)"
    },
    "B.Com (Bachelor of Commerce)": {
      streams: ["General", "Accounting", "Banking"],
      duration: "3 Years (6 Semesters)"
    },
    "M.Com (Master of Commerce)": {
      streams: ["General", "Accounting", "Finance"],
      duration: "2 Years (4 Semesters)"
    }
  },
  "Humanities & Social Science": {
    "MA (Master of Arts)": {
      streams: ["Hindi", "English", "History", "Political Science", "Sociology"],
      duration: "2 Years (4 Semesters)"
    },
    "BA (Bachelor of Arts)": {
      streams: ["Hindi", "English", "History", "Political Science", "Sociology", "Psychology"],
      duration: "3 Years (6 Semesters)"
    }
  },
  "Science": {
    "B.Sc (Bachelor of Science)": {
      streams: ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science"],
      duration: "3 Years (6 Semesters)"
    },
    "M.Sc (Master of Science)": {
      streams: ["Physics", "Chemistry", "Mathematics", "Biology"],
      duration: "2 Years (4 Semesters)"
    }
  },
  "Law": {
    "LLB (Bachelor of Laws)": {
      streams: ["General"],
      duration: "3 Years (6 Semesters)"
    },
    "LLM (Master of Laws)": {
      streams: ["General", "Corporate Law", "Criminal Law"],
      duration: "2 Years (4 Semesters)"
    }
  },
  "Education & Sports": {
    "B.Ed (Bachelor of Education)": {
      streams: ["General"],
      duration: "2 Years (4 Semesters)"
    },
    "M.Ed (Master of Education)": {
      streams: ["General"],
      duration: "2 Years (4 Semesters)"
    },
    "B.P.Ed (Bachelor of Physical Education)": {
      streams: ["General"],
      duration: "3 Years (6 Semesters)"
    }
  },
  "Pharmacy": {
    "B.Pharm (Bachelor of Pharmacy)": {
      streams: ["General"],
      duration: "4 Years (8 Semesters)"
    },
    "M.Pharm (Master of Pharmacy)": {
      streams: ["Pharmaceutics", "Pharmacology"],
      duration: "2 Years (4 Semesters)"
    }
  },
  "Paramedical Sciences": {
    "B.Sc Nursing": {
      streams: ["General"],
      duration: "4 Years (8 Semesters)"
    },
    "BMLT (Bachelor of Medical Lab Technology)": {
      streams: ["General"],
      duration: "3 Years (6 Semesters)"
    }
  },
  "Library & Information Science": {
    "B.Lib.Sc (Bachelor of Library Science)": {
      streams: ["General"],
      duration: "1 Year (2 Semesters)"
    },
    "M.Lib.Sc (Master of Library Science)": {
      streams: ["General"],
      duration: "1 Year (2 Semesters)"
    }
  },
  "Journalism & Mass Communication": {
    "BJMC (Bachelor of Journalism & Mass Communication)": {
      streams: ["Print Media", "Electronic Media", "Digital Media"],
      duration: "3 Years (6 Semesters)"
    },
    "MJMC (Master of Journalism & Mass Communication)": {
      streams: ["Print Media", "Electronic Media", "Digital Media"],
      duration: "2 Years (4 Semesters)"
    },
    "Diploma in Journalism": {
      streams: ["General"],
      duration: "1 Year (2 Semesters)"
    }
  },
  "Agriculture Science": {
    "B.Sc Agriculture": {
      streams: ["General", "Agronomy", "Horticulture"],
      duration: "4 Years (8 Semesters)"
    },
    "M.Sc Agriculture": {
      streams: ["Agronomy", "Horticulture", "Soil Science"],
      duration: "2 Years (4 Semesters)"
    }
  },
  "Yoga Science": {
    "B.Sc Yoga": {
      streams: ["General"],
      duration: "3 Years (6 Semesters)"
    },
    "M.Sc Yoga": {
      streams: ["General"],
      duration: "2 Years (4 Semesters)"
    },
    "Diploma in Yoga": {
      streams: ["General"],
      duration: "1 Year (2 Semesters)"
    },
    "Certificate in Yoga": {
      streams: ["General"],
      duration: "6 Months"
    }
  },
  "Fashion & Animation": {
    "B.Sc Fashion Design": {
      streams: ["General", "Textile Design", "Apparel Design"],
      duration: "3 Years (6 Semesters)"
    },
    "Diploma in Fashion Design": {
      streams: ["General"],
      duration: "1 Year (2 Semesters)"
    },
    "B.Sc Animation": {
      streams: ["2D Animation", "3D Animation", "VFX"],
      duration: "3 Years (6 Semesters)"
    },
    "Diploma in Animation": {
      streams: ["General"],
      duration: "1 Year (2 Semesters)"
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
