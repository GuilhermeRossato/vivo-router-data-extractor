# Vivo Box Extractor [ Under development ]

A program to connect to a network router interface and extract, parse, process, filter and save data from it.

The internal variables and their content are listed when the program starts, provided it is successful, it then continues to watch for changes and prints variables that were updated.

```
node index.js [...args]
```

## Arguments

Here are the list of arguments that can be used to alter the behaviour of this program:

```
--debug             Prints execution logs to the standard error pipe (stderr)
--only-status       Only extract status variables, disabling statistics
--only-statistics   Only extract statistics variables, disabling status
--skip-start        Disables printing of all variables at start up
--only-start        Prints all variables and exit the program
--slow              Prints updates lazily and slows down when there are few updates
--no-date           Removes the date string in local time from the output
--time              Adds the time number of the updated variable
--type              Adds the update type ('created', 'updated', 'removed') to the output
--previous          Adds the previous value of the variable to the output
--json              Changes the output format to JSON object lines separated by new lines
--session-id <id>   Specifies a session id to use while connecting to the router
--exclude <keys>    Excludes one or more variables from the outputprefixes
--include <keys>    Excludes all variables not specified from the output
           -> [keys] are prefixes of variable keys separated by comma, cas insensitive
--write <file>      Writes the program output (except logs) to a specified file by its path
--write <folder>    Creates a file named with the current date at the specified folder and writes the output to it
--append <file>     Append the output to the end of a file, adding to it without rewriting it
```

## Configuration

The program can be configured by creating an `.env` file on the project root or by setting environment variables.

The `ROUTER_USERNAME` and `ROUTER_PASSWORD` variables are used to login on the router and are required.
The `ROUTER_HOST` variable can be used to change the router host from the default (192.168.15.1).
The `ROUTER_HISTORY_CSV_FILE_PATH` variable can be defined so that the program appends process data to a file.

## Output

The internal router variables are printed one per line: Each line printed to the standard output starts with the variable name and an equal character (=) followed by the content of the variable in raw text. The program executes continuously, printing variables when they update.

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
