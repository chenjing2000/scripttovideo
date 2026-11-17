import type {Project} from './types';
import {validateProject} from './project';

// Persisted and in-memory project data have the same v3 schema.
export type PresentationProject=Project;
export const validatePresentationProject=validateProject;
