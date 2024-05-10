# xyz

> An Abbreviation for "examine your zipper".
>
> --
> <cite>[Urban Dictionary](https://www.urbandictionary.com/define.php?term=xyz)</cite>

Don't get caught with your [fly](https://fly.io/) down!

This is a web interface on top of the fly.io apis to make it easier to get a
better overview of all of your fly apps.

This is not meant to be deployed anywhere! It leverages your `flyctl` command
and auth token to make calls to fly.io on your behalf.

# Installation

You will need to be authenticated with the fly.io cli `flyctl`. You can check to
see if you're logged in by running `flyctl auth whoami`.

You will need to be authenticated with github packages in your local
environment. Follow
[these instructions](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token)
using the scope `@ksmithut`.

Once that is done, you can install it globally with
`npm install --global @ksmithut/xyz` (or your preferred package manager).

Once installed, you can now run the following to start up the server and
automatically open up a browser window:

```sh
xyz --open
```

Instead of installing it globally, you could also use `npx` to always pull the
latest version:

```sh
npx @ksmithut/xyz@latest --open
```

# Configuration

You can configure your own "Dashboard" by creating an `xyz.favorites` file.
Here's an example one:

```
Work ================
work-api
work-ui
work-db
work-monitoring

Personal ============
testing
cool-project
```

Any line that contains at least three `=` (equals signs) in a row will be
considered a label for the start of a new grouping. Empty lines are ignored and
the other lines should map to the names of your fly.io applications.

Now when you open up the home screen (or click on the XYZ in the top left of the
page) it will display these apps.

By default, `xyz` looks for this file in your current working directory, but you
can have it point somewhere else by using the `--favorites` flag.

If you'd like a global `xyz.favorites` file, you could put one in the config
directory for `xyz`. If you run `xyz config`, it will open up the config
directory in your operating system's file explorer, and you can open up

# Development

You'll need to be sure to install dependencies:

```sh
npm install
```

Then you run run the following to get the dev server(s) running:

```sh
npm run dev
```

That will start the back-end server and the vite development server.
