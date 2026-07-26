export const cmsConfig = Object.freeze({
  github: {
    owner: "puczynskimaciej-debug",
    repo: "poradnik-polaka-w-belgii",
    branch: "main",
    clientId: "Ov23liW8IVnJdl5VxttZ",
    scope: "public_repo"
  },
  paths: {
    articles: "src/content/articles",
    home: "src/_data/home.json",
    site: "src/_data/site.json",
    media: "src/Images/uploads"
  },
  oauthEndpoint: "/.netlify/functions/oauth",
  oauthRedirectUri: "https://polacywbelgii.eu/admin/"
});
