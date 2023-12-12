export interface Award {
  uid: string;
  name: string;
  description: string;
  image: string;

  owners: string[];
  recipients: string[];
}
