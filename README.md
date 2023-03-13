<p align="center">
<img src="assets/diggity-black.png" style="display: block; margin-left: auto; margin-right: auto; width: 50%;">
</p>

# Diggity Github Action
A Github Action that utilizes [Diggity](https://github.com/carbonetes/diggity#readme) to generate software bill-of-materials (SBOM).

## Scanning

```yaml
name: Diggity Action
on: [push, pull_request]
jobs:
  diggity:
    runs-on: ${{matrix.os}}
    strategy:
      matrix:
        os: [ubuntu-latest] # can add more os: windows-latest, macOS-latest
    steps:
      - name: Run carbonetes/diggity # runs the github action of diggity
        uses: carbonetes/diggity@v1.0.0 # runs the github action using this version
        with: # user’s input reference for scanning options, results that diggity-action supports.
          directory: "." # path to the directory to be scanned (default option for scanning)
          output_type: json # desired output format (default table)
          enabled_parsers: apk,go # specified enabled parsers (default all)
          disable_file_listing: true #  disables file listing from package metadata (default false).
          disable_secret_search: true #  disables secret search (default false).
          secret_exclude_filenames: filename_1,filename_2 # exclude secret searching for each specified filenames.
          secret_max_file_size: 10485760 # maximum file size that the secret will search (default 10485760).
          secrets_content_regex: content_regex # secret content regex are searched within files that matches the provided regular expression.
          tar: layer.tar # path to tar file to be scanned (use this instead of directory for tar file scanning).

```

## License

[Apache 2.0](https://choosealicense.com/licenses/apache-2.0/)