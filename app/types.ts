export interface PageParams {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}
