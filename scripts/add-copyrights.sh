#!/bin/bash

# Define the copyright header
read -r -d '' COPYRIGHT_HEADER << EOM
/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
EOM

# Loop over .ts and .tsx files in the plugins/ directory
for file in $(find . \( -path "./plugins/*" -o \( -path "./packages/*" -not -path "./packages/backend/*" -not -path "./packages/app/*" \) \) -type f \( -name "*.ts" -o -name "*.tsx" \)); do
    # Check if the file is ignored by Git
    if ! git check-ignore $file > /dev/null 2>&1; then
        # If it's not ignored, check if the copyright header already exists in the file
        echo $file
        if ! [[ "$(head -n4 $file)" == *"$COPYRIGHT_HEADER"* ]]; then
            echo $file Δ
            echo "${COPYRIGHT_HEADER}
$(cat $file)" > $file
        fi
    fi
done
