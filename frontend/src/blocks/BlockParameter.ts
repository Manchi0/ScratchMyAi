export type ParamType = 'int' | 'float' | 'boolean' | 'string' | 'select' | 'file';

export interface BaseParam {
  type: ParamType;
  label?: string;
}

export interface IntParam extends BaseParam {
  type: 'int';
  default: number;
  min?: number;
  max?: number;
}

export interface FloatParam extends BaseParam {
  type: 'float';
  default: number;
  min?: number;
  max?: number;
}

export interface BooleanParam extends BaseParam {
  type: 'boolean';
  default: boolean;
}

export interface SelectParam extends BaseParam {
  type: 'select';
  default: string;
  options: { label: string; value: string }[];
}

export interface FileParam extends BaseParam {
  type: 'file';
  default: string | null;
  accept?: string;
}

export interface StringParam extends BaseParam {
  type: 'string';
  default: string;
}

export type BlockParameter = IntParam | FloatParam | BooleanParam | SelectParam | FileParam | StringParam;
