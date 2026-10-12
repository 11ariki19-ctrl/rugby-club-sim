import { hasCareerSave } from './career';
import { openCareerMode } from './career-ui';

export function installCareerEntry(root: HTMLElement): void {
  const addButtons = () => {
    const center = root.querySelector<HTMLElement>('.center');
    if (!center || center.querySelector('[data-career-entry]')) return;
    const start = document.createElement('button');
    start.className = 'btn big';
    start.textContent = '🏉 ラグビー人生キャリア';
    start.dataset.careerEntry = 'new';
    const note = center.querySelector('.note');
    if (note) center.insertBefore(start, note);
    else center.appendChild(start);
    if (hasCareerSave()) {
      const resume = document.createElement('button');
      resume.className = 'btn big';
      resume.textContent = '人生キャリアの続きから';
      resume.dataset.careerEntry = 'continue';
      if (note) center.insertBefore(resume, note);
      else center.appendChild(resume);
    }
  };
  root.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-career-entry]');
    if (!button) return;
    event.preventDefault();
    openCareerMode(root, button.dataset.careerEntry === 'continue');
  });
  const observer = new MutationObserver(addButtons);
  observer.observe(root, { childList: true, subtree: true });
  addButtons();
}
