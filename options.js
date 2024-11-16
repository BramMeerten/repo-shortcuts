document.addEventListener("DOMContentLoaded", (event) => {
  loadSettings().then(() => {});
});

let repos = [];

async function loadSettings() {
  repos = await loadReposFromStorage();
  const container = document.getElementById("repo-list");
  [...repos, { url: ""}]
    .map(createRepoInputElement)
    .forEach(elem => container.appendChild(elem));
}

function createRepoInputElement(repo) {
  const div = document.createElement("div");
  const input = document.createElement("input");
  input.value = repo.url;
  input.placeholder = "Repo URL";
  input.addEventListener('keyup', event => {
    addOrRemoveLastInputElements();
    updateSettings();
  });
  div.appendChild(input);

  const tagInput = document.createElement("input");
  tagInput.value = repo.tag || null;
  tagInput.placeholder = "Tag";
  tagInput.addEventListener('keyup', event => {
     addOrRemoveLastInputElements();
     updateSettings();
  });
  div.appendChild(tagInput);

  return div;
}

function addOrRemoveLastInputElements() {
  const container = document.getElementById("repo-list"); // TODO hardcoded repo-list
  const children = container.getElementsByTagName("input");

  if (children.length >= 2 && (children[children.length - 2].value?.trim() || children[children.length - 1].value?.trim())) {
    container.appendChild(createRepoInputElement({url: ""}));
  
  } else if (children.length >= 4 && (!children[children.length - 4].value?.trim() && !children[children.length - 3].value?.trim())) {
    container.removeChild(children[children.length - 1].parentElement);
  }
}

async function updateSettings() {
  const container = document.getElementById("repo-list"); // TODO hardcoded repo-list
  const children = [...container.getElementsByTagName("input")];
  const repos = [];

  for (let i=0; i<children.length; i += 2) {
    const url = children[i].value?.trim();
    const tag = children[i+1].value?.trim();

    let error = false;
    if (i !== children.length-2) {
      if (!url) {
        error = true;
      } else {
        const hostSettings = findHostSettingsByUrl(url);
        error = !hostSettings || !extractRepoNameFromUrl(hostSettings, url);
      }
    }

    if (!error) {
      children[i].classList.remove("error");
      repos.push({url, tag: tag || undefined});
    } else {
      children[i].classList.add("error"); // TODO error message
    }
  }

  await saveReposInStorage(repos); // TODO error handling
}
