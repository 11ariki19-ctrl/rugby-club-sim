import './style.css';
import { mount } from './ui';
import { installCareerEntry } from './career-entry';

const app = document.getElementById('app') as HTMLElement;
mount(app);
installCareerEntry(app);
