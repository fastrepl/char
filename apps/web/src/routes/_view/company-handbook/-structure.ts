export const handbookStructure = {
  sections: [
    "about",
    "how-we-work",
    "who-we-want",
    "go-to-market",
    "communication",
    "beliefs",
  ],
  sectionTitles: {
    about: "About",
    "how-we-work": "How We Work",
    "who-we-want": "Who We Want",
    "go-to-market": "Go To Market",
    communication: "Communication",
    beliefs: "Beliefs",
  } as Record<string, string>,
  defaultPages: {
    about: "about/what-hyprnote-is",
    "how-we-work": "how-we-work/work-styles",
    "who-we-want": "who-we-want/core-traits",
    "go-to-market": "go-to-market/customers",
    communication: "communication/why-this-matters",
    beliefs: "beliefs/what-we-believe",
  } as Record<string, string>,
};
