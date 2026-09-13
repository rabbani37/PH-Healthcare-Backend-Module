export interface IQuery {
    searchTerm?: string
    page?: string
    limit?: string
    sortOrder?: string
    sortBy?: string



    // any other filter filed can be added
    [key: string]: any
}