const LINK_MODES = {
    PULL_REQUEST: {},
    COMMITS: { hotKey: 'c', label: 'com' },
    SOURCE: { hotKey: 's', label: 'src' },
    CREATE_PULL_REQUEST: { hotKey: 'p', label: 'c-pr' },
}
const DEFAULT_MODE = LINK_MODES.PULL_REQUEST;
const DEFAULT_REPOS = [{ url: 'https://github.com/BramMeerten/repo-shortcuts', tag: 'example' }];

let linkMode = undefined;
let highlight = 0;
let allRepos = [];
let visibleRepos = [];

document.addEventListener("DOMContentLoaded", () => {
  loadRepos().then(repos => {
      allRepos = repos;

    }).catch(error => {
      console.error("Failed to load repo's:", error);
      allRepos = undefined;

    }).finally(() => {
      visibleRepos = allRepos;
      updateVisibleRepos();
      initSearch();
      initKeysListener();
      initSettings();
    });
});

async function loadRepos() {
    let repos = await loadReposFromStorage();

    if (repos.length === 0) {
      try {
        repos = DEFAULT_REPOS;
        await saveReposInStorage(repos);
      } catch (error) {
        console.error("Failed to save default repo.");
        repos = [];
      }
    }

    return repos
      .map(repo => ({...repo, host: findHostSettingsByUrl(repo.url)?.host}))
      .map(repo => ({...repo, name: getRepoName(repo)}))
      .map(repo => {
        return {...repo, url: repo.url.endsWith("/") ? repo.url.substring(0, repo.url.length-2) : repo.url };
      })
      .sort(compareRepos);
}

function getRepoName(repo) {
    const hostSettings = findHostSettingsByHostname(repo.host);
    if (!hostSettings) {
      console.error('Unexpected error. Could not find host settings for repo', repo.url);
      return undefined;
    }

    return extractRepoNameFromUrl(hostSettings, repo.url); 
}

function initSearch() {
    const input = document.getElementById('search-container').getElementsByTagName('input')[0];
    input.addEventListener("keyup", (event) => handleSearchKeyUp(event));
    input.addEventListener("keydown", (event) => handleSearchKeyDown(event));
}

function initSettings() {
    document.getElementById('settings').addEventListener('click', () => {
        browser.runtime.openOptionsPage()
    });
}

function updateVisibleRepos() {
    const container = document.getElementById("repos-container");
    while (container.firstChild)
        container.removeChild(container.lastChild);

    if (allRepos === undefined) {
      const div = document.createElement("div");
      div.className = 'error';
      div.textContent = 'Unexpected error: Failed to load repositories';

      container.appendChild(div);
      return;
    }

    visibleRepos.forEach(repo => {
        const div = document.createElement("div");
        div.className = 'repo-row';

        repo.tag && div.appendChild(createTagBadge(repo.tag));
        div.appendChild(createRepoNameElement(repo));
        container.appendChild(div);
    });

    updateHighlight();
}

function updateHighlight() {
    for (let row of document.getElementsByClassName('highlighted')) {
        row.classList.remove('highlighted');
    }

    const rows = document.getElementById('repos-container').getElementsByClassName('repo-row');
    if (rows.length === 0) {
        highlight = 0;
        return;

    } else if (rows.length <= highlight) {
        highlight = rows.length - 1;
    }

    rows.item(highlight).classList.add('highlighted');
    scrollIntoViewAndWait(rows.item(highlight)).then(() => {
        // Needed because input at top is focused,
        // otherwise it will always first jump up to the input, and then down to highlight
        rows.item(highlight).scrollIntoView({ block: 'center', inline: 'center' });
    });
}

function scrollIntoViewAndWait(element) {
    return new Promise(resolve => {
        if ('onscrollend' in window) {
            document.addEventListener('scrollend', resolve, { once: true });
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        } else {
            resolve()
        }
    });
}

function compareRepos(r1, r2) {
    const tag1 = r1.tag || '';
    const tag2 = r2.tag || '';
    const tagResult = tag1 > tag2 ? 1 : (tag1 === tag2 ? 0 : -1);
    const nameResult = r1.name > r2.name ? 1 : -1;
    return tagResult === 0 ? nameResult : tagResult;
}

function createTagBadge(tag) {
    const span = document.createElement('span')
    span.className = 'dir-badge';
    span.innerText = tag;
    return span;
}

function createRepoNameElement(repo) {
    const nameElem = document.createElement('span');
    nameElem.innerText = repo.name;
    return nameElem;
}

function handleSearchKeyUp(event) {
    if (!linkMode) {
        const found = Object.values(LINK_MODES)
            .filter(mode => event.target.value.startsWith(mode.hotKey + ' '));
        if (found.length > 0) {
            linkMode = found[0];
            event.target.value = event.target.value.substring(linkMode.hotKey.length + ' '.length);
        }
    }
    updateLinkModeElement();
    updateDisplayedRepos(event.target.value);
}

function handleSearchKeyDown(event) {
    if (event.code === 'Backspace' && event.target.value === '') {
        linkMode = undefined;
    }
}

function updateLinkModeElement() {
    if (linkMode) {
        document.getElementById('link-mode').innerText = linkMode.label;
        document.getElementById('link-mode').hidden = false;
    } else {
        document.getElementById('link-mode').hidden = true;
    }
}

function updateDisplayedRepos(search) {
    const searchWords = search.split(' ');
    visibleRepos = allRepos.filter(repo => {
        return searchWords
            .map(w => w.toLowerCase())
            .every(word => {
                const matchesName = repo.name.toLowerCase().includes(word);
                const matchesTag = repo.tag && repo.tag.includes(word);
                return matchesName || matchesTag;
            });
    });

    updateVisibleRepos();
}

function initKeysListener() {
    let cmdPressed = false;
    let shiftPressed = false;

    document.addEventListener('keydown', (event) => {
        if (event.code === 'MetaLeft') cmdPressed = true;
        if (event.code === 'ShiftRight' || event.code === 'ShiftLeft') shiftPressed = true;
    });
    document.addEventListener('keyup', (event) => {
        if (event.code === 'MetaLeft') cmdPressed = false;
        if (event.code === 'ShiftRight' || event.code === 'ShiftLeft') shiftPressed = false;
    });

    document.addEventListener('keydown', (event) => {
        if (event.code === 'ArrowDown') {
            highlight = (highlight + 1) % visibleRepos.length;

        } else if (event.code === 'ArrowUp') {
            highlight -= 1;
            if (highlight < 0 && visibleRepos.length > 0)
                highlight = visibleRepos.length - 1;
            else if (highlight < 0)
                highlight = 0;
        } else if (event.code === 'Enter' && highlight < visibleRepos.length) {
            const mode = linkMode || DEFAULT_MODE;
            const repo = visibleRepos[highlight];
            const suffix = getSuffix(repo, mode);
            let url = repo.url + suffix;
            url = (/^https?:\/\/.+/).test(url) ? url : 'https://' + url;
            if (shiftPressed) {
                chrome.tabs.update(undefined, {url});
                window.close();
            } else {
                chrome.tabs.create({url: url, active: !cmdPressed});
                window.close();
            }
        }
        updateHighlight();
    });
}

function getSuffix(repo, mode) {
    const settings = findHostSettingsByHostname(repo.host);
    if (!settings) {
        return '';
    }

    switch (mode) {
        case LINK_MODES.PULL_REQUEST:
            return settings['PULL_REQUEST'];
        case LINK_MODES.COMMITS:
            return settings['COMMITS'];
        case LINK_MODES.SOURCE:
            return settings['SOURCE'];
        case LINK_MODES.CREATE_PULL_REQUEST:
            return settings['CREATE_PULL_REQUEST'];
        default:
            return ''
    }
}
