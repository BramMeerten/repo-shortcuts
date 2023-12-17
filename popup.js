const LINK_MODES = {
    PULL_REQUEST: { hotKey: 'p', label: 'pr' },
    SOURCE: { hotKey: 's', label: 'src' },
    CREATE_PULL_REQUEST: { hotKey: 'c', label: 'c-pr' },
}
const DEFAULT_MODE = LINK_MODES.PULL_REQUEST;
const PREFIX = 'https://bitbucket.org/cjsm/';
const REPOS = sortFlattenedRepos(flattenRepos(REPO_SOURCE));

document.addEventListener("DOMContentLoaded", (event) => {
    visibleRepos = REPOS;
    updateVisibleRepos();
    initSearch();
    initKeysListener();
});

let linkMode = undefined;
let highlight = 0;
let visibleRepos = [];

function initSearch() {
    const input = document.getElementById('search-container').getElementsByTagName('input')[0];
    input.addEventListener("keyup", (event) => handleSearchKeyUp(event));
    input.addEventListener("keydown", (event) => handleSearchKeyDown(event));
}

function updateVisibleRepos() {
    const container = document.getElementById("repos-container");
    while (container.firstChild)
        container.removeChild(container.lastChild);
    visibleRepos.forEach(repo => {
        const dirElements = repo.dir.map(dir => createDirBadge(dir));
        const nameElem = createRepoNameElement(repo);

        const div= document.createElement("div");
        div.className = 'repo-row';

        dirElements.forEach(e => div.appendChild(e));
        div.appendChild(nameElem);
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

function flattenRepos(repos, dir = [], result = []) {
    const curDir = [...dir];
    if (repos.name) curDir.push(repos.name);

    repos.repos.forEach(repo => {
        result.push({ repo, dir: curDir });
    });

    (repos.subDirs || []).forEach(subDir => result = flattenRepos(subDir, curDir, result));

    return result;
}

function sortFlattenedRepos(repos) {
    return repos.sort((r1, r2) => {
        const dirs1 = r1.dir.join(' ');
        const dirs2 = r2.dir.join(' ');
        const dirResult = dirs1 > dirs2 ? 1 : (dirs1 === dirs2 ? 0 : -1);
        const nameResult = r1.repo.name > r2.repo.name ? 1 : -1;
        return dirResult === 0 ? nameResult : dirResult;
    });
}

function createDirBadge(dir) {
    const span = document.createElement('span')
    span.className = 'dir-badge';
    span.innerText = dir;
    return span;
}

function createRepoNameElement(repo) {
    const nameElem = document.createElement('span');
    nameElem.innerText = repo.repo.name;
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
    visibleRepos = REPOS.filter(repo => {
        return searchWords
            .map(w => w.toLowerCase())
            .every(word => {
                const matchesName = repo.repo.name.toLowerCase().includes(word);
                const matchesDir = repo.dir.some(dir => dir.toLowerCase().includes(word));
                return matchesName || matchesDir;
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
            const suffix = getSuffix(mode);
            const url = PREFIX + visibleRepos[highlight].repo.name + suffix;
            if (shiftPressed) {
                chrome.tabs.update(undefined, {url});
                window.close();
            } else {
                chrome.tabs.create({url: url, active: !cmdPressed});
            }
        }
        updateHighlight();
    });
}

function getSuffix(mode) {
    switch (mode.hotKey) {
        case LINK_MODES.PULL_REQUEST.hotKey:
            return '/pull-requests/';
        case LINK_MODES.SOURCE.hotKey:
            return '/src/';
        case LINK_MODES.CREATE_PULL_REQUEST.hotKey:
            return '/pull-requests/new';
        default:
            return ''
    }
}
