{
  description = "dev-environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/release-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = import nixpkgs { inherit system; };
      in with pkgs; rec {
        # Development environment
        devShell = mkShell {
          name = "dev-shell";
          nativeBuildInputs = [ nodejs typescript-language-server tailwindcss-language-server ];
        };

        # The default package when a specific package name isn't specified.
        defaultPackage = packages.app;
      }
    );
}
