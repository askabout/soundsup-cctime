namespace CCTime.Api.Endpoints;

public static class EndpointExtensions
{
    public static void MapAllEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapReferenceEndpoints();
        app.MapReserveEndpoints();
    }
}
