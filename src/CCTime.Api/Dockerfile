FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY CCTime.Domain/CCTime.Domain.csproj CCTime.Domain/
COPY CCTime.Infrastructure/CCTime.Infrastructure.csproj CCTime.Infrastructure/
COPY CCTime.Api/CCTime.Api.csproj CCTime.Api/
RUN dotnet restore CCTime.Api/CCTime.Api.csproj

COPY . .
RUN dotnet publish CCTime.Api/CCTime.Api.csproj -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
COPY web/ /app/wwwroot/
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "CCTime.Api.dll"]
