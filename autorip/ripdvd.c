#include <unistd.h>
#include <stdlib.h>

int main() {
  if (chdir("/mnt/klipspringer/dvd")) return 1;
  system("echo '--- start  dvd rip' `date` >> rip.log");
  system("dvdbackup -M -i /dev/cdrom >> rip.log 2>&1");
  system("echo '--- finish dvd rip' `date` >> rip.log");
  system("eject /dev/cdrom");
  return 0;
}
