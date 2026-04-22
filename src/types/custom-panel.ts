export interface CoverRowBlock {
  id: string;
  type: 'cover-row';
  entityId: string;
  label?: string;
}

export interface ButtonBlock {
  id: string;
  type: 'button';
  label: string;
  icon?: string;
  variant: 'primary' | 'secondary';
  domain: string;
  service: string;
  targetEntityIds: string[];
}

export interface InlineButton {
  id: string;
  label: string;
  icon?: string;
  variant: 'primary' | 'secondary';
  domain: string;
  service: string;
  targetEntityIds: string[];
}

export interface ButtonRowBlock {
  id: string;
  type: 'button-row';
  buttons: InlineButton[];
}

export interface SectionHeaderBlock {
  id: string;
  type: 'section-header';
  title: string;
}

export type CustomBlock = CoverRowBlock | ButtonBlock | ButtonRowBlock | SectionHeaderBlock;

export interface CustomPanel {
  id: string;
  name: string;
  icon?: string;
  blocks: CustomBlock[];
}
