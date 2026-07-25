import { cmsConfig } from "./config.js";
import { GitHubAuth } from "./modules/auth.js";
import { GitHubApi } from "./modules/github-api.js";
import { ContentRepository } from "./modules/repository.js";

const state = { api: null, repository: null, user: null, home: null, homeSha: null, site: null, siteSha: null, articles: [], media: [], uploadTarget: null };
const auth = new GitHubAuth(cmsConfig.github);
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

async function initialize() {
  try {
    if (location.search.includes("code=")) {
      showLoading();
      await auth.completeCallback(cmsConfig.oauthEndpoint);
    }
    if (!auth.token()) return showAuth();
    showLoading();
    state.api = new GitHubApi({ token: auth.token(), ...cmsConfig.github });
    const repositoryInfo = await state.api.repository();
    if (!repositoryInfo.permissions?.push) throw new Error("To konto GitHub nie ma prawa zapisu do repozytorium.");
    state.user = await githubUser();
    state.repository = new ContentRepository(state.api, cmsConfig.paths);
    await loadContent();
    showApp();
  } catch (error) {
    sessionStorage.clear();
    showAuth(error.message);
  }
}

async function githubUser() {
  const response = await fetch("https://api.github.com/user", { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${auth.token()}`, "X-GitHub-Api-Version": "2022-11-28" } });
  if (!response.ok) throw new Error("Nie udało się odczytać konta GitHub.");
  return response.json();
}

async function loadContent() {
  const [home, site, articles, media] = await Promise.all([state.repository.home(), state.repository.site(), state.repository.articles(), state.repository.media()]);
  [state.home, state.homeSha, state.site, state.siteSha, state.articles, state.media] = [home.data, home.sha, site.data, site.sha, articles, media];
  renderAll();
}

function showAuth(error = "") {
  $("#loading-view").hidden = true; $("#app-view").hidden = true; $("#auth-view").hidden = false;
  const box = $("#auth-error"); box.textContent = error; box.hidden = !error;
}
function showLoading() { $("#auth-view").hidden = true; $("#app-view").hidden = true; $("#loading-view").hidden = false; }
function showApp() {
  $("#auth-view").hidden = true; $("#loading-view").hidden = true; $("#app-view").hidden = false;
  $("#current-user").textContent = state.user.name || state.user.login;
  $("#repository-name").textContent = `${cmsConfig.github.owner}/${cmsConfig.github.repo}`;
  $("#user-avatar").src = state.user.avatar_url;
}
function notify(text, error = false) {
  const box = $("#notice"); box.textContent = text; box.className = `message${error ? " message--error" : ""}`; box.hidden = false;
  clearTimeout(notify.timer); notify.timer = setTimeout(() => box.hidden = true, 5000);
}
function renderAll() {
  $("#article-count").textContent = state.articles.length; $("#news-count").textContent = state.home.news.length; $("#media-count").textContent = state.media.length;
  renderHome(); renderArticles(); renderSite(); renderMedia();
}
function renderHome() {
  const form = $("#home-form"); form.eyebrow.value = state.home.hero.eyebrow; form.title.value = state.home.hero.title; form.description.value = state.home.hero.description;
  renderRepeater("news", state.home.news); renderRepeater("notices", state.home.notices);
}
function renderRepeater(type, items) {
  const fields = type === "news" ? [["title","Tytuł"],["category","Kategoria"],["description","Opis"],["image","Zdjęcie"],["link","Link"]] : [["title","Tytuł"],["category","Kategoria"],["date","Data"],["description","Treść"],["contact","Kontakt"]];
  $(`#${type}-editor`).innerHTML = items.map((item, index) => `<div class="repeat-item" data-index="${index}"><button class="remove" type="button" data-remove="${type}">×</button>${fields.map(([key,label]) => `<label class="${key === "description" ? "wide" : ""}">${label}${key === "description" ? `<textarea data-field="${key}" rows="2">${escapeHtml(item[key] || "")}</textarea>` : `<input data-field="${key}" value="${escapeHtml(item[key] || "")}">`}</label>`).join("")}${type === "news" ? `<button class="secondary" type="button" data-news-upload="${index}">Wgraj zdjęcie</button>` : ""}</div>`).join("");
}
function readRepeater(type) { return $$(`#${type}-editor .repeat-item`).map((row) => Object.fromEntries($$("[data-field]", row).map((field) => [field.dataset.field, field.value.trim()]))); }
function renderArticles() {
  $("#articles-list").innerHTML = state.articles.length ? state.articles.map((article) => `<div class="table-row"><div><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.category || "Bez kategorii")} · ${formatDate(article.date)}</p></div><div class="row-actions"><button class="secondary" data-edit-article="${article.slug}">Edytuj</button><button class="ghost danger" data-delete-article="${article.slug}">Usuń</button></div></div>`).join("") : "<p>Nie ma jeszcze artykułów.</p>";
}
function renderSite() {
  const form = $("#site-form"); form.elements["contact.email"].value = state.site.contact.email; form.elements["contact.area"].value = state.site.contact.area; form.elements["contact.heading"].value = state.site.contact.heading; form.elements["contact.description"].value = state.site.contact.description;
  $("#seo-editor").innerHTML = ["home","articles","contact"].map((page) => `<fieldset><legend>${{home:"Strona główna",articles:"Artykuły",contact:"Kontakt"}[page]}</legend><label>Tytuł SEO<input data-seo="${page}.title" value="${escapeHtml(state.site.seo[page].title)}"></label><label>Opis SEO<textarea data-seo="${page}.description" rows="2">${escapeHtml(state.site.seo[page].description)}</textarea></label></fieldset>`).join("");
}
function renderMedia() {
  $("#media-grid").innerHTML = state.media.length ? state.media.map((file) => `<article class="media-card"><img src="${file.download_url}" alt=""><div><p title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</p><button class="ghost danger" data-delete-media="${escapeHtml(file.path)}">Usuń</button></div></article>`).join("") : "<p>Biblioteka jest pusta.</p>";
}
function switchView(name) { $$(".view").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === name)); $$(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.view === name)); $(".sidebar").classList.remove("is-open"); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? String(value || "") : date.toLocaleDateString("pl-PL"); }
function formData(form) { return Object.fromEntries(new FormData(form).entries()); }

function openArticle(article = null) {
  const form = $("#article-form"); form.reset(); $("#article-dialog-title").textContent = article ? "Edytuj artykuł" : "Nowy artykuł";
  const values = article || { date: new Date().toISOString() }; Object.entries(values).forEach(([key,value]) => { if (form.elements[key]) form.elements[key].value = key === "date" ? String(value).slice(0,16) : value || ""; });
  form.slug.value = article?.slug || ""; $("#article-dialog").showModal();
}
async function uploadImage(target = null) { state.uploadTarget = target; $("#media-input").click(); }

$("#github-login").addEventListener("click", () => { try { auth.login(); } catch (error) { showAuth(error.message); } });
$("#logout-button").addEventListener("click", () => auth.logout());
$("#menu-toggle").addEventListener("click", () => $(".sidebar").classList.toggle("is-open"));
$$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
$$("[data-language-tab]").forEach((button) => button.addEventListener("click", () => { $$("[data-language-tab]").forEach((tab) => tab.classList.toggle("is-active", tab === button)); $$("[data-language-pane]").forEach((pane) => pane.classList.toggle("is-active", pane.dataset.languagePane === button.dataset.languageTab)); }));

$("#home-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const button = event.submitter; setBusy(button, true);
  try { state.home = { hero: { eyebrow: event.target.eyebrow.value.trim(), title: event.target.title.value.trim(), description: event.target.description.value.trim() }, news: readRepeater("news"), notices: readRepeater("notices") }; const result = await state.repository.saveHome(state.home, state.homeSha); state.homeSha = result.content.sha; notify("Zapisano. Netlify rozpocznie publikację."); renderAll(); } catch(error) { notify(error.message,true); } finally { setBusy(button,false); }
});
$("#site-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const button = event.submitter; setBusy(button,true);
  try { state.site.contact = { email:event.target.elements["contact.email"].value.trim(), area:event.target.elements["contact.area"].value.trim(), heading:event.target.elements["contact.heading"].value.trim(), description:event.target.elements["contact.description"].value.trim() }; $$("[data-seo]").forEach((field) => { const [page,key]=field.dataset.seo.split("."); state.site.seo[page][key]=field.value.trim(); }); const result=await state.repository.saveSite(state.site,state.siteSha); state.siteSha=result.content.sha; notify("Ustawienia kontaktu i SEO zapisane."); } catch(error){notify(error.message,true);} finally{setBusy(button,false);}
});
$("#article-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const button=event.submitter; setBusy(button,true); const values=formData(event.target); const original=state.articles.find((article)=>article.slug===values.slug);
  try { await state.repository.saveArticle(values,original); $("#article-dialog").close(); state.articles=await state.repository.articles(); renderAll(); notify("Artykuł zapisany. Netlify rozpocznie publikację."); } catch(error){notify(error.message,true);} finally{setBusy(button,false);}
});
$("#media-input").addEventListener("change", async (event) => {
  const file=event.target.files[0]; if(!file)return;
  try { const uploaded=await state.repository.upload(file); if(state.uploadTarget) state.uploadTarget.value=uploaded.path; state.media=await state.repository.media(); renderAll(); notify("Obraz zapisany w repozytorium."); } catch(error){notify(error.message,true);} finally{state.uploadTarget=null;event.target.value="";}
});
document.addEventListener("click", async (event) => {
  const action=event.target.closest("[data-action]")?.dataset.action;
  if(action==="new-article")openArticle(); if(action==="add-news"){state.home.news.push({title:"",category:"",description:"",image:"",link:"/artykuly/"});renderRepeater("news",state.home.news);} if(action==="add-notice"){state.home.notices.push({title:"",category:"",date:"",description:"",contact:""});renderRepeater("notices",state.home.notices);} if(action==="upload-media")uploadImage(); if(action==="pick-article-image")uploadImage($("#article-form").image);
  const remove=event.target.closest("[data-remove]"); if(remove&&confirm("Usunąć ten element?")){const type=remove.dataset.remove;state.home[type].splice(Number(remove.closest("[data-index]").dataset.index),1);renderRepeater(type,state.home[type]);}
  const newsUpload=event.target.closest("[data-news-upload]"); if(newsUpload)uploadImage($(`#news-editor [data-index="${newsUpload.dataset.newsUpload}"] [data-field="image"]`));
  const edit=event.target.closest("[data-edit-article]"); if(edit)openArticle(state.articles.find((item)=>item.slug===edit.dataset.editArticle));
  const removeArticle=event.target.closest("[data-delete-article]"); if(removeArticle&&confirm("Trwale usunąć artykuł z GitHub?")){try{const article=state.articles.find((item)=>item.slug===removeArticle.dataset.deleteArticle);await state.repository.deleteArticle(article);state.articles=await state.repository.articles();renderAll();notify("Artykuł usunięty.");}catch(error){notify(error.message,true);}}
  const removeMedia=event.target.closest("[data-delete-media]"); if(removeMedia&&confirm("Trwale usunąć obraz z GitHub?")){try{const file=state.media.find((item)=>item.path===removeMedia.dataset.deleteMedia);await state.repository.deleteMedia(file);state.media=await state.repository.media();renderAll();notify("Obraz usunięty.");}catch(error){notify(error.message,true);}}
  if(event.target.closest("[data-close]"))event.target.closest("dialog").close();
});
function setBusy(button,busy){if(!button)return;button.disabled=busy;if(busy){button.dataset.label=button.textContent;button.textContent="Zapisywanie…";}else if(button.dataset.label)button.textContent=button.dataset.label;}

initialize();
