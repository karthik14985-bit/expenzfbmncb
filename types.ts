
export type Category = 
  | 'Food & Drink'
  | 'Shopping'
  | 'Housing'
  | 'Transport'
  | 'Travel'
  | 'Entertainment'
  | 'Health'
  | 'Income'
  | 'Utilities'
  | 'Other';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: Category;
  date: string;
  type: 'income' | 'expense';
}

export interface Budget {
  category: Category;
  limit: number;
}

export interface ReceiptData {
  amount: number;
  description: string;
  category: Category;
  date: string;
}
