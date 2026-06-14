import { PERSON, SITE_NAME, SITE_URL } from "./site";

export function buildPersonJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#victor-grossman`,
    name: PERSON.name,
    alternateName: PERSON.alternateName,
    description: PERSON.description,
    birthDate: PERSON.birthDate,
    deathDate: PERSON.deathDate,
    birthPlace: {
      "@type": "Place",
      name: PERSON.birthPlace,
    },
    deathPlace: {
      "@type": "Place",
      name: PERSON.deathPlace,
    },
    jobTitle: PERSON.jobTitle,
    knowsAbout: PERSON.knowsAbout,
    sameAs: PERSON.sameAs,
    image: PERSON.heroImage,
    url: SITE_URL,
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: "Victor Grossman Memorial Website",
    url: SITE_URL,
    description: PERSON.description,
    inLanguage: ["en", "de"],
    about: { "@id": `${SITE_URL}/#victor-grossman` },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function buildWebPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: "Victor Grossman (1928–2025) — Memorial & Digital Archive",
    description: PERSON.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#victor-grossman` },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: PERSON.heroImage,
    },
    inLanguage: "en",
  };
}

export function buildProfilePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${SITE_URL}/#profilepage`,
    url: SITE_URL,
    name: "Victor Grossman Memorial Profile",
    mainEntity: { "@id": `${SITE_URL}/#victor-grossman` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
}

export function buildHomeJsonLdGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildPersonJsonLd(),
      buildWebSiteJsonLd(),
      buildWebPageJsonLd(),
      buildProfilePageJsonLd(),
    ],
  };
}
