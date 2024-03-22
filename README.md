# Vivo Box Extractor [ Under development ]

A program that connects to a network router interface, extracts and parses its internal state data, and serve it as a JSON event stream.

```
node index.js [...args]
```

![Execution demo](./images/demo.gif)

The program starts by extracting, parsing, and printing the current router state with all internal variables and their values. After this initial stage the program starts watching for updates and prints variables only when they are changed.

The output is a series of events separated by newline characters (char code 10), each event is represented as a standard json object string. The variables extracted from the router are printed to the standard output when they are updated, each output line contains a json object describing the change.

The extraction has two fetching stages: Status, for variables, and Statistics, for usage and host list.
## Arguments

```
--debug             Prints execution logs to the standard error pipe (stderr)
--only-status       Only extract status variables, disabling statistics
--only-statistics   Only extract statistics variables, disabling status
--skip-start        Disables the initial printing of all variables at start up
--only-start        Prints all variables and exit the program
--slow              Delay the output and printing of updates to produce a constant output stream.
--no-date           Removes the extracted date string property from update entries.
--time              Adds the "time" property to update entries with the number of milliseconds since the epoch from the extracted date.
--type              Adds the "type" property with the update type ('created', 'updated', 'removed') to the output
--previous          Adds the "previous" property to entries with the value that was replaced from the variable
--text              Changes the output format from JSON objects to key-values (still separated by lines)
--session-id <id>   Specifies a session id to use while connecting to the router
--exclude <prefix>  Excludes one or more variables from the output by their starting text, case insensitive
--include <prefix>  Excludes all variables not specified from the output by their starting text, case insensitive
--save <file>       Writes the program output (except logs) to a specified file by its path
--save <folder>     Creates a file named with the current date at the specified folder and writes the output to it
--append <file>     Append the output of the program to the end of a file, adding text to it
```

## Environment Configuration

The program has some fixed variables that can be configured by using an `.env` file on the project root or by setting environment variables.

The `ROUTER_USERNAME` and `ROUTER_PASSWORD` variables are used to login on the router and are required.
The `ROUTER_HOST` variable can be used to change the router host from the default (192.168.15.1).
The `ROUTER_HISTORY_CSV_FILE_PATH` variable is used to append process spawn event data to a file every time the script starts executing.

## Dependencies

This project can be executed by using [node.js](https://nodejs.org/), it was tested on v20.10.

There are no external packages required and `npm install` is not necessary.

I developed this repository to work on the router of model *RTF3505VW-N2* when it uses the software of model *Vivo Box BR_SV_g000_R3505VWN1001_s42*, the interface dashboard it provides is this:

![Vivo Box Router Interface](images/interface.png)

## Motivation

Keeping track of the status and usage of your network is useful, and any good sysadmin must do it, but as a Computer Engineer gratuate I learned how to do that in specialized routers or dedicated Linux machines that snooped the network or talked to other linux machines to aggregate this data.

In my case I needed to get data straight from the source: The network router. My network provider installed a router that displays its current status: fiber optical signal stregth, connected devices, configured routing, properties of interfaces, and the most useful information of all: the amount of bytes sent and received from _each interface_.

However, the current status is only about this very instant: there's no information about change, like speed and variables from the past which limits how much useful it is.

I decided to reverse-engineer my personal router and analyze its internal communication protocol to create this project: A program to extract, parse, digest, transform, save, and visualize the router information in ways I felt would be useful.

I also self-host some hobby projects like my personal blog (https://grossato.com.br/) and other services so tracking usage and downtime is useful to make sure they work.
